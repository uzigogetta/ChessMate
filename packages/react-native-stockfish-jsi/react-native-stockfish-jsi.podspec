require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = "react-native-stockfish-jsi"
  s.version      = package['version']
  s.summary      = package['description'] || "Native Stockfish chess engine for React Native"
  s.homepage     = package['homepage'] || "https://github.com/uzigogetta/ChessMate"
  s.license      = package['license'] || "MIT"
  s.authors      = package['author'] || { "uzigogetta" => "dev@example.com" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/uzigogetta/ChessMate.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/StockfishJSI.mm",
    "cpp/StockfishJSI.cpp",
    "cpp/stockfish/src/*.cpp",
    "cpp/stockfish/src/nnue/*.cpp",
    "cpp/stockfish/src/nnue/features/*.cpp",
    "cpp/stockfish/src/syzygy/*.cpp"
  ]

  s.exclude_files = [
    "cpp/stockfish/src/main.cpp"
  ]

  s.public_header_files = []
  
  s.header_mappings_dir = "cpp"
  
  s.resources = ["ios/stockfish.nnue"]
  
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      "\"$(PODS_TARGET_SRCROOT)/cpp/stockfish/src\"",
      "\"$(PODS_ROOT)/Headers/Public/React-Core\"",
      "\"$(PODS_ROOT)/Headers/Public/React-RCTFabric\"",
      "\"$(PODS_ROOT)/Headers/Public/ReactCommon\"",
      "\"$(PODS_ROOT)/boost\"",
      "\"$(PODS_ROOT)/DoubleConversion\"",
      "\"$(PODS_ROOT)/fmt/include\"",
      "\"$(PODS_ROOT)/RCT-Folly\"",
      "\"${PODS_CONFIGURATION_BUILD_DIR}/React-Codegen/React_Codegen.framework/Headers\""
    ].join(' '),
    "GCC_PREPROCESSOR_DEFINITIONS" => [
      "USE_PTHREADS=1",
      "NDEBUG=1",
      "NNUE_EMBEDDING_OFF=1"
    ].join(' '),
    "OTHER_CPLUSPLUSFLAGS" => [
      "-DFOLLY_NO_CONFIG",
      "-DFOLLY_MOBILE=1",
      "-DFOLLY_USE_LIBCPP=1",
      "-std=c++17",
      "-Ofast",
      "-ffast-math",
      "-fno-exceptions",
      "-w"
    ].join(' '),
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "CLANG_CXX_LIBRARY" => "libc++",
    "GCC_OPTIMIZATION_LEVEL" => "fast",
    "ENABLE_BITCODE" => "NO"
  }

  s.dependency "React-Core"
  s.dependency "React-callinvoker"
  s.dependency "ReactCommon/turbomodule/core"
end
