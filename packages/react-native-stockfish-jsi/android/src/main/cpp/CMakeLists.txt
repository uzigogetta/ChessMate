cmake_minimum_required(VERSION 3.13.4)

project(stockfish-jsi)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_VERBOSE_MAKEFILE ON)

# Stockfish compile flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Ofast -ffast-math -flto -fno-exceptions -fvisibility=hidden -w")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DUSE_PTHREADS -DNDEBUG -DNNUE_EMBEDDING_OFF")

# Find React Native directories
file(GLOB REACT_NATIVE_DIR "${CMAKE_SOURCE_DIR}/../../../../node_modules/react-native")

if (NOT EXISTS ${REACT_NATIVE_DIR})
    file(GLOB REACT_NATIVE_DIR "${CMAKE_SOURCE_DIR}/../../../react-native")
endif()

# Stockfish source files
file(GLOB STOCKFISH_SOURCES
    "${CMAKE_SOURCE_DIR}/../../../../cpp/stockfish/src/*.cpp"
    "${CMAKE_SOURCE_DIR}/../../../../cpp/stockfish/src/nnue/*.cpp"
    "${CMAKE_SOURCE_DIR}/../../../../cpp/stockfish/src/nnue/features/*.cpp"
    "${CMAKE_SOURCE_DIR}/../../../../cpp/stockfish/src/syzygy/*.cpp"
)

# Exclude main.cpp and benchmark.cpp
list(FILTER STOCKFISH_SOURCES EXCLUDE REGEX ".*main\\.cpp$")
list(FILTER STOCKFISH_SOURCES EXCLUDE REGEX ".*benchmark\\.cpp$")

# JSI Bridge
set(JSI_BRIDGE_SOURCE "${CMAKE_SOURCE_DIR}/../../../../cpp/StockfishJSI.cpp")

# Create shared library
add_library(stockfish-jsi SHARED
    ${STOCKFISH_SOURCES}
    ${JSI_BRIDGE_SOURCE}
    StockfishJSI.cpp
)

# Include directories
target_include_directories(stockfish-jsi PRIVATE
    "${CMAKE_SOURCE_DIR}/../../../../cpp/stockfish/src"
    "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
    "${REACT_NATIVE_DIR}/ReactCommon"
    "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
    "${REACT_NATIVE_DIR}/ReactCommon/jsi"
    "${REACT_NATIVE_DIR}/ReactCommon/react/nativemodule/core"
)

# Compiler options
target_compile_options(stockfish-jsi PRIVATE 
    -Ofast 
    -ffast-math
    -flto 
    -fvisibility=hidden 
    -fno-exceptions 
    -w
)

# Find libraries
find_library(LOG_LIB log)
find_library(ANDROID_LIB android)

# Link libraries
target_link_libraries(stockfish-jsi
    ${LOG_LIB}
    ${ANDROID_LIB}
    -pthread
)
