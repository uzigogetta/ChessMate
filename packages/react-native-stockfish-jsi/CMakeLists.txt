cmake_minimum_required(VERSION 3.13.4)

add_library(stockfish-jsi SHARED
    cpp/StockfishJSI.cpp
)

set_target_properties(stockfish-jsi PROPERTIES
    LINKER_LANGUAGE CXX
)

target_compile_features(stockfish-jsi PRIVATE cxx_std_17)

