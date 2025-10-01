#include <jsi/jsi.h>
#include <thread>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <atomic>
#include <string>
#include <sstream>
#include <iostream>

// Stockfish includes
#include "stockfish/src/engine.h"
#include "stockfish/src/uci.h"
#include "stockfish/src/misc.h"
#include "stockfish/src/position.h"
#include "stockfish/src/thread.h"
#include "stockfish/src/ucioption.h"

using namespace facebook;

namespace StockfishJSI {

// Global state
static std::unique_ptr<Stockfish::Engine> engine = nullptr;
static std::thread engineThread;
static std::queue<std::string> commandQueue;
static std::mutex queueMutex;
static std::condition_variable queueCV;
static std::atomic<bool> running{false};
static std::function<void(const std::string&)> jsCallback = nullptr;
static std::mutex callbackMutex;
static jsi::Runtime* callbackRuntime = nullptr;

// Custom output stream that sends to JS callback
class JSIOutputStream : public std::streambuf {
public:
    JSIOutputStream() = default;
    
protected:
    int overflow(int c) override {
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
                // Remove trailing newline
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
    
    int sync() override {
        flush();
        return 0;
    }
    
private:
    std::string buffer;
};

static std::unique_ptr<JSIOutputStream> jsiOutput;
static std::unique_ptr<std::ostream> outputStream;

// Get NNUE path from platform
std::string getNNUEPath();

// Forward declarations
void processCommand(const std::string& cmd);

// Engine worker thread
void engineWorkerThread() {
    // Redirect stdout to our custom stream
    jsiOutput = std::make_unique<JSIOutputStream>();
    outputStream = std::make_unique<std::ostream>(jsiOutput.get());
    
    // Initialize Stockfish engine with path for NNUE loading
    std::string nnuePath = getNNUEPath();
    engine = std::make_unique<Stockfish::Engine>(nnuePath.empty() ? std::nullopt : std::optional<std::string>(nnuePath));
    
    // Send initial UCI response
    *outputStream << "Stockfish 17.1 by the Stockfish developers" << std::endl;
    *outputStream << "id name Stockfish 17.1" << std::endl;
    *outputStream << "id author the Stockfish developers" << std::endl;
    
    // Process commands from queue
    while (running) {
        std::unique_lock<std::mutex> lock(queueMutex);
        
        // Wait for commands or stop signal
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
            
            // Process UCI commands
            processCommand(command);
            
            lock.lock();
        }
    }
    
    // Cleanup
    engine.reset();
    outputStream.reset();
    jsiOutput.reset();
}

// Process individual UCI command
void processCommand(const std::string& cmd) {
    if (!engine) return;
    
    std::istringstream iss(cmd);
    std::string token;
    iss >> std::skipws >> token;
    
    if (token == "uci") {
        *outputStream << "uciok" << std::endl;
    }
    else if (token == "isready") {
        *outputStream << "readyok" << std::endl;
    }
    else if (token == "setoption") {
        std::string name, value;
        std::string temp;
        
        // Parse: setoption name <id> value <x>
        while (iss >> temp) {
            if (temp == "name") {
                iss >> std::ws;
                std::getline(iss, name, ' ');
                while (iss >> temp && temp != "value") {
                    name += " " + temp;
                }
                if (temp == "value") {
                    iss >> std::ws;
                    std::getline(iss, value);
                }
                break;
            }
        }
        
        if (!name.empty()) {
            auto& options = engine->get_options();
            if (options.count(name)) {
                options[name] = value;
            }
        }
    }
    else if (token == "ucinewgame") {
        engine->search_clear();
    }
    else if (token == "position") {
        std::string fen, movesToken;
        std::vector<std::string> moves;
        
        iss >> token; // startpos or fen
        
        if (token == "startpos") {
            fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            iss >> movesToken; // might be "moves"
        } else if (token == "fen") {
            std::string fenPart;
            fen = "";
            while (iss >> fenPart && fenPart != "moves") {
                if (!fen.empty()) fen += " ";
                fen += fenPart;
            }
            if (fenPart == "moves") {
                movesToken = "moves";
            }
        }
        
        if (movesToken == "moves" || (iss >> movesToken && movesToken == "moves")) {
            std::string move;
            while (iss >> move) {
                moves.push_back(move);
            }
        }
        
        engine->set_position(fen, moves);
    }
    else if (token == "go") {
        Stockfish::Search::LimitsType limits;
        limits.startTime = Stockfish::now();
        
        std::string param;
        while (iss >> param) {
            if (param == "depth") {
                iss >> limits.depth;
            } else if (param == "movetime") {
                iss >> limits.movetime;
            } else if (param == "wtime") {
                iss >> limits.time[Stockfish::WHITE];
            } else if (param == "btime") {
                iss >> limits.time[Stockfish::BLACK];
            } else if (param == "winc") {
                iss >> limits.inc[Stockfish::WHITE];
            } else if (param == "binc") {
                iss >> limits.inc[Stockfish::BLACK];
            } else if (param == "movestogo") {
                iss >> limits.movestogo;
            } else if (param == "nodes") {
                iss >> limits.nodes;
            } else if (param == "infinite") {
                limits.infinite = true;
            }
        }
        
        // Setup callbacks for search info
        engine->set_on_update_full([&](const Stockfish::Engine::InfoFull& info) {
            std::ostringstream oss;
            oss << "info depth " << info.depth
                << " score cp " << info.score
                << " nodes " << info.nodes
                << " nps " << info.nps
                << " time " << info.time
                << " pv " << info.pv;
            *outputStream << oss.str() << std::endl;
        });
        
        engine->set_on_bestmove([&](std::string_view bestmove, std::string_view ponder) {
            *outputStream << "bestmove " << bestmove;
            if (!ponder.empty()) {
                *outputStream << " ponder " << ponder;
            }
            *outputStream << std::endl;
        });
        
        engine->go(limits);
        engine->wait_for_search_finished();
    }
    else if (token == "stop") {
        engine->stop();
    }
    else if (token == "quit") {
        running = false;
        queueCV.notify_one();
    }
}

// JSI Functions

void init(jsi::Runtime& rt, const jsi::Object& options) {
    if (running) {
        return; // Already initialized
    }
    
    running = true;
    
    // Start engine thread
    engineThread = std::thread(engineWorkerThread);
    
    // Give engine time to initialize
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Send initial UCI command
    send(rt, jsi::String::createFromAscii(rt, "uci"));
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    send(rt, jsi::String::createFromAscii(rt, "isready"));
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
    
    // Create a shared_ptr to the callback function
    auto callbackPtr = std::make_shared<jsi::Function>(callback.getFunction(rt));
    
    jsCallback = [callbackPtr](const std::string& line) {
        if (callbackRuntime) {
            try {
                callbackRuntime->global().getPropertyAsFunction(*callbackRuntime, "setTimeout")
                    .call(*callbackRuntime,
                        jsi::Function::createFromHostFunction(
                            *callbackRuntime,
                            jsi::PropNameID::forAscii(*callbackRuntime, "callback"),
                            0,
                            [callbackPtr, line](jsi::Runtime& rt, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {
                                callbackPtr->call(rt, jsi::String::createFromUtf8(rt, line));
                                return jsi::Value::undefined();
                            }
                        ),
                        0
                    );
            } catch (...) {
                // Fallback: direct call (might block JS thread briefly)
                callbackPtr->call(*callbackRuntime, jsi::String::createFromUtf8(*callbackRuntime, line));
            }
        }
    };
}

void dispose(jsi::Runtime& rt) {
    if (!running) return;
    
    // Signal thread to stop
    running = false;
    queueCV.notify_one();
    
    // Wait for thread to finish
    if (engineThread.joinable()) {
        engineThread.join();
    }
    
    // Clear callback
    {
        std::lock_guard<std::mutex> lock(callbackMutex);
        jsCallback = nullptr;
        callbackRuntime = nullptr;
    }
}

} // namespace StockfishJSI

// Install function to be called from native code
extern "C" {

void installStockfish(jsi::Runtime& rt) {
    auto installFn = jsi::Function::createFromHostFunction(
        rt,
        jsi::PropNameID::forAscii(rt, "install"),
        0,
        [](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {
            jsi::Object api(runtime);
            
            // init(options)
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
            
            // send(command)
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
            
            // setOnMessage(callback)
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
            
            // dispose()
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
