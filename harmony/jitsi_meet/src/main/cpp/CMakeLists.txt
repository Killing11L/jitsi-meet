cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME rnoh_jitsi_meet)

set(CUR_DIR ${CMAKE_CURRENT_SOURCE_DIR})

set(JITSIMEET_CPP_SRC
    ${CUR_DIR}/AppInfoTurboModule.cpp
    ${CUR_DIR}/LogBridgeTurboModule.cpp
    ${CUR_DIR}/AudioModeTurboModule.cpp
    ${CUR_DIR}/PictureInPictureTurboModule.cpp
    ${CUR_DIR}/ProximityTurboModule.cpp
    ${CUR_DIR}/DropboxTurboModule.cpp
    ${CUR_DIR}/ConnectionServiceTurboModule.cpp
    ${CUR_DIR}/LocaleDetectorTurboModule.cpp
    ${CUR_DIR}/JitsiOngoingConferenceTurboModule.cpp
)

add_library(${PACKAGE_NAME} SHARED ${JITSIMEET_CPP_SRC})

# RNOH 头文件根(oh_modules/@rnoh/react-native-openharmony/src/main/cpp)
# 提供 RNOH/Package.h、RNOH/ArkTSTurboModule.h 及其传递依赖(jsi/ReactCommon/...)。
set(RNOH_CPP_DIR ${CUR_DIR}/../../../oh_modules/@rnoh/react-native-openharmony/src/main/cpp)

target_include_directories(${PACKAGE_NAME} PUBLIC
    ${CUR_DIR}
    ${RNOH_CPP_DIR}
)

# C++20(与 RNOH 主线一致)
target_compile_options(${PACKAGE_NAME} PRIVATE $<$<COMPILE_LANGUAGE:CXX>:-std=c++20>)

# 链接 RNOH:TurboModule/ArkTSTurboModule/ArkJS 等实现 + napi/hilog 运行时。
target_link_libraries(${PACKAGE_NAME} PUBLIC
    rnoh
    libace_napi.z.so
    libhilog_ndk.z.so
)
