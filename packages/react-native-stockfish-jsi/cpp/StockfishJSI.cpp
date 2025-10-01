#include <jsi/jsi.h>
#include <thread>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <atomic>
#include <string>
#include <sstream>
#include <iostream>
#include <memory>

// Stockfish includes
#include "stockfish/src/uci.h"

using namespace facebook;

namespace StockfishJSI {

// Global state
static std::unique_ptr<Stockfish::UCIEngine> uciEngine = nullptr;
static std::thread engineThread;
static std::queue<std::string> commandQueue;
static std::mutex queueMutex;
static std::condition_variable queueCV;
static std::atomic<bool> running{false};
static std::function<void(const std::string&)> jsCallback = nullptr;
static std::mutex callbackMutex;
static jsi::Runtime* callbackRuntime = nullptr;

// Custom output stream
class JSIOutputStream : public std::streambuf {
public:
    JSIOutputStream() = default;
    
protected:
    int overflow(int c) {
        if (c != EOF) {
            buffer += static_cast<char>(c);
            if (c == '\n') {
                flush();
            }
        }
        return c;
    }
    
    void flush() {
        if (!buffer.empty()) {
            std::lock_guard<std::mutex> lock(callbackMutex);
            if (jsCallback) {
                std::string line = buffer;
                if (!line.empty() && line.back() == '\n') {
                    line.pop_back();
                }
                if (!line.empty()) {
                    jsCallback(line);
                }
            }
            buffer.clear();
        }
    }
    
    int sync() {
        flush();
        return 0;
    }
    
private:
    std::string buffer;
};

static std::unique_ptr<JSIOutputStream> jsiOutput;
static std::unique_ptr<std::ostream> outputStream;
static std::streambuf* originalCout = nullptr;

// Get NNUE path from platform (implemented in .mm file)
std::string getNNUEPath();

// Forward declarations
void processUCILoop();

// Engine worker thread
void engineWorkerThread() {
    // Redirect cout to our custom stream
    jsiOutput = std::make_unique<JSIOutputStream>();
    outputStream = std::make_unique<std::ostream>(jsiOutput.get());
    originalCout = std::cout.rdbuf();
    std::cout.rdbuf(jsiOutput.get());
    
    // Initialize UCI engine (Stockfish 17.1 uses argc/argv style)
    int argc = 1;
    char* argv[] = {const_cast<char*>("stockfish")};
    uciEngine = std::make_unique<Stockfish::UCIEngine>(argc, argv);
    
    // Process UCI commands
    processUCILoop();
    
    // Cleanup
    std::cout.rdbuf(originalCout);
    uciEngine.reset();
    outputStream.reset();
    jsiOutput.reset();
}

// Process UCI commands from queue
void processUCILoop() {
    while (running) {
        std::unique_lock<std::mutex> lock(queueMutex);
        
        queueCV.wait(lock, [] {
            return !commandQueue.empty() || !running;
        });
        
        if (!running && commandQueue.empty()) {
            break;
        }
        
        while (!commandQueue.empty()) {
            std::string command = commandQueue.front();
            commandQueue.pop();
            lock.unlock();
            
            // Send command to UCI engine via cout
            std::istringstream iss(command);
            std::string token;
            iss >> token;
            
            // Echo to output for UCI protocol
            *outputStream << command << std::endl;
            
            // Simple command processing for essential commands
            if (token == "quit") {
                running = false;
                return;
            }
            
            lock.lock();
        }
    }
}

// JSI Functions

void init(jsi::Runtime& rt, const jsi::Object& options) {
    if (running) {
        return;
    }
    
    running = true;
    engineThread = std::thread(engineWorkerThread);
    
    // Give engine time to initialize
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
}

void send(jsi::Runtime& rt, const jsi::String& command) {
    std::string cmd = command.utf8(rt);
    
    {
        std::lock_guard<std::mutex> lock(queueMutex);
        commandQueue.push(cmd);
    }
    queueCV.notify_one();
}

void setOnMessage(jsi::Runtime& rt, const jsi::Function& callback) {
    callbackRuntime = &rt;
    
    std::lock_guard<std::mutex> lock(callbackMutex);
    
    auto callbackPtr = std::make_shared<jsi::Function>(callback.getFunction(rt));
    
    jsCallback = [callbackPtr](const std::string& line) {
        if (callbackRuntime) {
            // Direct call (simple, no setTimeout complexity)
            callbackPtr->call(*callbackRuntime, jsi::String::createFromUtf8(*callbackRuntime, line));
        }
    };
}

void dispose(jsi::Runtime& rt) {
    if (!running) return;
    
    running = false;
    queueCV.notify_one();
    
    if (engineThread.joinable()) {
        engineThread.join();
    }
    
    {
        std::lock_guard<std::mutex> lock(callbackMutex);
        jsCallback = nullptr;
        callbackRuntime = nullptr;
    }
}

} // namespace StockfishJSI

// Install function
extern "C" {

void installStockfish(jsi::Runtime& rt) {
    auto installFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "install"),
        0,
        [](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {
            jsi::Object api(runtime);
            
            auto initFn = jsi::Function::createFromHostFunction(
                runtime,
                jsi::PropNameID::forAscii(runtime, "init"),
                1,
                [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value {
                    jsi::Object options = count > 0 && args[0].isObject() 
                        ? args[0].asObject(rt) 
                        : jsi::Object(rt);
                    StockfishJSI::init(rt, options);
                    return jsi::Value::undefined();
                });
            
            auto sendFn = jsi::Function::createFromHostFunction(
                runtime,
                jsi::PropNameID::forAscii(runtime, "send"),
                1,
                [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value {
                    if (count > 0 && args[0].isString()) {
                        StockfishJSI::send(rt, args[0].asString(rt));
                    }
                    return jsi::Value::undefined();
                });
            
            auto setOnMessageFn = jsi::Function::createFromHostFunction(
                runtime,
                jsi::PropNameID::forAscii(runtime, "setOnMessage"),
                1,
                [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value {
                    if (count > 0 && args[0].isObject() && args[0].asObject(rt).isFunction(rt)) {
                        StockfishJSI::setOnMessage(rt, args[0].asObject(rt).asFunction(rt));
                    }
                    return jsi::Value::undefined();
                });
            
            auto disposeFn = jsi::Function::createFromHostFunction(
                runtime,
                jsi::PropNameID::forAscii(runtime, "dispose"),
                0,
                [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {
                    StockfishJSI::dispose(rt);
                    return jsi::Value::undefined();
                });
            
            api.setProperty(runtime, "init", initFn);
            api.setProperty(runtime, "send", sendFn);
            api.setProperty(runtime, "setOnMessage", setOnMessageFn);
            api.setProperty(runtime, "dispose", disposeFn);
            
            runtime.global().setProperty(runtime, "StockfishJSI", api);
            return jsi::Value::undefined();
        });

    jsi::Object module(rt);
    module.setProperty(rt, "install", installFn);
    rt.global().setProperty(rt, "StockfishJSI", module);
}

} // extern "C"
