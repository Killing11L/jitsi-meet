> 文档模板：v0.4.2

<p align="center">
  <h1 align="center"> <code>jitsi-meet</code> </h1>
</p>

本项目基于 [jitsi-meet](https://github.com/jitsi/jitsi-meet) 开发。

该第三方库的仓库已迁移至 Gitcode，且支持直接从 npm 下载，新的包名为：`@react-native-ohos/react-native-jitsi`（JS 别名 `@jitsi/react-native-sdk`），版本所属关系如下：

| 三方库名称 | 三方库版本（npm地址） | 发布信息 | 支持RN版本 | Autolink | 编译API版本 | 社区基线版本 | 源码地址 |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-jitsi | ~ 12.1.5 (开发中) | [Github Releases](https://github.com/react-native-oh-library/jitsi-meet/releases) | 0.77.* / 0.82.* | 是 | API12+ | 12.1.4 | [Github](https://github.com/react-native-oh-library/jitsi-meet) |

## 简介

jitsi-meet 是一套开源的视频会议解决方案。本库为其提供 React Native 鸿蒙（HarmonyOS）适配，通过 `JitsiMeeting` 组件即可在 RN 应用中嵌入完整的音视频会议能力，支持会议加入/离开、音视频静音、画中画、分组讨论、事件回调、功能开关（Feature Flags）等。

鸿蒙侧为**纯 ArkTS TurboModule + 薄 C++ 桥接**，不携带预编译 so；音视频底层依赖（WebRTC 等）由使用方按需集成对应的鸿蒙适配。

## 下载安装

进入到工程目录并输入以下命令：

**npm**

```bash
npm install @react-native-ohos/react-native-jitsi
```

**yarn**

```bash
yarn add @react-native-ohos/react-native-jitsi
```

> [!WARNING] JS 侧通过别名 `@jitsi/react-native-sdk` 导入。本库 `peerDependencies` 较多，其中 `react-native-webrtc` 的鸿蒙适配**不在本包内**，需使用方自行集成，否则会议无音视频。

## Link

| | 是否支持autolink | RN框架版本 |
| - | - | - |
| ~12.1.5 | 是 | 0.77 / 0.82 |

使用AutoLink的工程需要根据该文档配置，Autolink框架指导文档：https://gitcode.com/CPF-RN/ohos_react_native/blob/master/docs/zh-cn/Autolinking.md

如您使用的版本支持 Autolink，并且工程已接入 Autolink，可跳过ManualLink配置。
<details>
  <summary>ManualLink: 此步骤为手动配置原生依赖项的指导</summary>

首先需要使用 DevEco Studio 打开项目里的 HarmonyOS 工程 `harmony`。

### 1. Overrides RN SDK

为了让工程依赖同一个版本的 RN SDK，需要在工程根目录的 `oh-package.json5` 添加 overrides 字段，指向工程需要使用的 RN SDK 版本。替换的版本既可以是一个具体的版本号，也可以是一个模糊版本，还可以是本地存在的 HAR 包或源码目录。

关于该字段的作用请阅读[官方说明](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-oh-package-json5-V5#zh-cn_topic_0000001792256137_overrides)

```json
{
  "overrides": {
    "@rnoh/react-native-openharmony": "^0.82.30" // ohpm 在线版本
    // "@rnoh/react-native-openharmony" : "./react_native_openharmony.har" // 指向本地 har 包的路径
    // "@rnoh/react-native-openharmony" : "./react_native_openharmony" // 指向源码路径
  }
}
```

### 2. 引入原生端代码

目前有两种方法：

1. 通过 har 包引入（在 IDE 完善相关功能后该方法会被遗弃，目前首选此方法）；
2. 直接链接源码。

方法一：通过 har 包引入（推荐）

> [!TIP] har 包位于三方库安装路径的 `harmony` 文件夹下。

打开 `entry/oh-package.json5`，添加以下依赖

```json
"dependencies": {
    "@rnoh/react-native-openharmony": "file:../react_native_openharmony",
    "@react-native-ohos/react-native-jitsi": "file:../../node_modules/@react-native-ohos/react-native-jitsi/harmony/jitsi_meet.har"
  }
```

点击右上角的 `sync` 按钮

或者在终端执行：

```bash
cd entry
ohpm install
```

方法二：直接链接源码

> [!TIP] 如需使用直接链接源码，请参考[直接链接源码说明](https://gitcode.com/CPF-RN/usage-docs/blob/master/zh-cn/link-source-code.md)

### 3. 配置 CMakeLists 和引入 JitsiMeetPackage

> 若工程已接入 RNOH AutoLink，且本库的 `harmony.autolinking` 配置生效，则 CMake 与 `PackageProvider` 注册可由 AutoLink 自动生成，可跳过本节手动配置。

打开 `entry/src/main/cpp/CMakeLists.txt`，添加：

```diff
project(rnapp)
cmake_minimum_required(VERSION 3.4.1)
set(CMAKE_SKIP_BUILD_RPATH TRUE)
set(RNOH_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
set(NODE_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../node_modules")
+ set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")
set(RNOH_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../react-native-harmony/harmony/cpp")
set(LOG_VERBOSITY_LEVEL 1)
set(CMAKE_ASM_FLAGS "-Wno-error=unused-command-line-argument -Qunused-arguments")
set(CMAKE_CXX_FLAGS "-fstack-protector-strong -Wl,-z,relro,-z,now,-z,noexecstack -s -fPIE -pie")
set(WITH_HITRACE_SYSTRACE 1) # for other CMakeLists.txt files to use
add_compile_definitions(WITH_HITRACE_SYSTRACE)

add_subdirectory("${RNOH_CPP_DIR}" ./rn)

# RNOH_BEGIN: manual_package_linking_1
add_subdirectory("../../../../sample_package/src/main/cpp" ./sample-package)
+ add_subdirectory("${OH_MODULES}/@react-native-ohos/react-native-jitsi/src/main/cpp" ./jitsi_meet)

# RNOH_END: manual_package_linking_1

add_library(rnoh_app SHARED
    ${GENERATED_CPP_FILES}
    "./PackageProvider.cpp"
    "${RNOH_CPP_DIR}/RNOHAppNapiBridge.cpp"
)

target_link_libraries(rnoh_app PUBLIC rnoh)

# RNOH_BEGIN: manual_package_linking_2
target_link_libraries(rnoh_app PUBLIC rnoh_sample_package)
+ target_link_libraries(rnoh_app PUBLIC rnoh_jitsi_meet)
# RNOH_END: manual_package_linking_2
```

> [!Tip] 注意：jitsi 鸿蒙侧为纯 ArkTS TurboModule + 薄 C++ 桥接，CMake 目标 `rnoh_jitsi_meet` 仅链接 `rnoh`、`libace_napi.z.so`、`libhilog_ndk.z.so`，无需额外集成第三方 so；WebRTC 等媒体能力由使用方集成的 `react-native-webrtc` 鸿蒙适配提供。

打开 `entry/src/main/cpp/PackageProvider.cpp`，添加：

```diff
#include "RNOH/PackageProvider.h"
+ #include "JitsiMeetPackage.h"

using namespace rnoh;

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx)
{
    return {
+        std::make_shared<JitsiMeetPackage>(ctx),
    };
}
```

### 4. 在 ArkTs 侧引入 JitsiMeetPackage

打开 `entry/src/main/ets/RNPackagesFactory.ts`，或者 `entry/src/main/ets/rn/RNPackagesFactory.ts`，添加：

```diff
  ...
+ import { JitsiMeetPackage } from '@react-native-ohos/react-native-jitsi/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [
    new SamplePackage(ctx),
+   new JitsiMeetPackage(ctx),
  ];
}
```
</details>

### 5. 工程metro.config.js配置
```diff
const { mergeConfig, getDefaultConfig } = require('@react-native/metro-config');
const { createHarmonyMetroConfig } = require('@react-native-oh/react-native-harmony/metro.config');
+ const { createJitsiMetroConfig } = require('@react-native-ohos/react-native-jitsi/metro.config');

const config = {
    resetCache: true,
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                experimentalImportSupport: false,
                inlineRequires: true,
            },
        }),
    },
};

+const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(
  defaultConfig,
  createHarmonyMetroConfig({ reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony' }),
+  createJitsiMetroConfig(defaultConfig)
);
```

### 6. 依赖库

该库依赖以下库，需要同时在package.json安装，相关鸿蒙库的具体安装步骤可以在[usage-docs](https://gitcode.com/CPF-RN/usage-docs)查找。

```diff
"dependencies": {
+  "@react-native-ohos/react-native-webrtc": "124.0.8-rc.11",
+  "@react-native-ohos/react-native-gcanvas": "6.0.25-rc.1",
+  "@react-native-ohos/react-native-device-info": "14.1.2-beta.3",
+  "@react-native-ohos/react-native-worklets-core": "1.6.0-rc.1",
+  "@react-native-ohos/react-native-background-timer": "2.6.0-beta.1",
+  "@react-native-ohos/react-native-performance": "5.3.0-beta.1",
+  "@react-native-ohos/react-native-default-preference": "1.6.0-beta.1",
+  "@sayem314/react-native-keep-awake": "npm:@react-native-ohos/react-native-keep-awake@4.2.0-beta.1",
+  "@react-native-ohos/async-storage": "2.3.0-beta.1",
+  "@react-native-community/netinfo": "npm:@react-native-ohos/netinfo@11.5.0-beta.1",
+  "@react-native-ohos/react-native-calendar-events": "2.4.0-rc.1",
+  "@amplitude/analytics-browser": "2.17.12",
+  "@amplitude/analytics-react-native": "1.5.16",
+  "@react-native-ohos/react-native-webview": "13.16.2-rc.5",
+  "@react-native-ohos/react-native-orientation-locker": "1.9.0-beta.2",
+  "@react-native-google-signin/google-signin": "10.1.0",
+  "@react-native-ohos/react-native-sound": "0.13.0-rc.1",
+  "@react-native-ohos/slider": "5.1.2",
+  "@react-native-ohos/react-native-video": "6.14.1",
+  "@react-native-ohos/react-native-get-random-values": "1.13.0-beta.2",
+  "@react-native-ohos/react-native-safe-area-context": "5.6.3",
+  "@react-native-ohos/react-native-svg": "15.13.1-rc.2",
+  "@react-native-ohos/react-native-dialog": "9.3.1-rc.1",
+  "react-native-gesture-handler": "2.25.0",
+  "react-native-svg": "15.15.0",
+  "@react-native-ohos/react-native-screens": "4.9.0-rc.14",
+  "react-native-screens": "4.17.1",
+  "@react-native-ohos/native-stack": "7.4.0-rc.11",
+  "@react-native-ohos/react-native-gesture-handler": "2.23.3"
}

"overrides": {
  "@react-native-community/cli": "15.0.1",
+  "use-latest-callback": "0.2.6"
}

```


### 运行

点击右上角的 `sync` 按钮

或者在终端执行：

```bash
cd entry
ohpm install
```

然后编译、运行即可。

## 约束与限制

### 兼容性

要使用此库，需要使用正确的 React-Native 和 RNOH 版本。另外，还需要使用配套的 DevEco Studio 和手机 ROM。

本文档内容基于以下版本验证通过：

1. RNOH: 0.82.1; SDK: HarmonyOS API Version 21 Release SDK; IDE: DevEco Studio 6.0.1.260; ROM: 6.0.0.130;

### 权限要求

会议涉及音视频采集、网络访问与画中画等能力，使用时需在 `entry/src/main/module.json5` 配置对应权限：

- 网络访问、音视频采集需要申请网络、麦克风、相机权限；
- 画中画/退后台保活需要为 `EntryAbility` 配置 `backgroundModes: ["voip"]`。

在 `entry/src/main/module.json5` 中添加：

```diff
{
  "module": {
    "name": "entry",
    "type": "entry",

  ···

    "requestPermissions": [
+     { "name": "ohos.permission.INTERNET" },
+     { "name": "ohos.permission.MICROPHONE" },
+     { "name": "ohos.permission.CAMERA" }
    ],
    "abilities": [
      {
        "name": "EntryAbility",
        "description": "$string:EntryAbility_desc",
        "icon": "$media:icon",
        "label": "$string:EntryAbility_label",
        "startWindowIcon": "$media:icon",
        "startWindowBackground": "$color:start_window_background",
+        "backgroundModes": ["voip"],
        "visible": true,
      }
    ]
  }
}
```

### 编译运行API要求

> [!TIP] 当前三方库所有版本均已实现版本隔离，支持在 `API12+` 工程编译，及 `API12+` ROM运行。

## 使用示例
下面的代码展示了这个库的基本使用场景：

> [!WARNING] 使用时 import 的库名不变，JS 侧通过 `@jitsi/react-native-sdk` 导入 `JitsiMeeting`。

```javascript
import React, { useRef } from 'react';
import { View, StyleSheet, Button, Alert } from 'react-native';
import { JitsiMeeting } from '@jitsi/react-native-sdk';

export default function App() {
    const jitsiRef = useRef(null);

    return (
        <View style={styles.container}>
            <JitsiMeeting
                ref={jitsiRef}
                room="testroom123"
                serverURL="https://meet.jit.si"
                style={styles.meet}
                userInfo={{
                    displayName: 'HarmonyOS User',
                }}
                eventListeners={{
                    onConferenceJoined: () => console.log('已加入会议'),
                    onConferenceWillJoin: () => console.log('即将加入会议'),
                    onParticipantJoined: (p) => console.log('参与者加入', p?.displayName),
                    onParticipantLeft: ({ id }) => console.log('参与者离开', id),
                    onReadyToClose: () => console.log('会议准备关闭'),
                }}
            />
            <Button title="静音" onPress={() => jitsiRef.current?.setAudioMuted(true)} />
            <Button title="关闭视频" onPress={() => jitsiRef.current?.setVideoMuted(true)} />
            <Button title="退出会议" onPress={() => jitsiRef.current?.close()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    meet: { flex: 1 },
});
```

## 使用说明

> [!TIP] jitsi-meet 是完整的视频会议 SDK，`JitsiMeeting` 组件内部自渲染整个会议 UI。本库鸿蒙侧为纯 ArkTS TurboModule，不携带 WebRTC 等媒体 so，须由使用方集成 `react-native-webrtc` 的鸿蒙适配后才有音视频能力。

**初始化会议**

```javascript
import { JitsiMeeting } from '@jitsi/react-native-sdk';

// room 含 '://' 时作为完整会议 URL 解析（忽略 serverURL），否则与 serverURL 拼接
<JitsiMeeting
  room="testroom123"
  serverURL="https://meet.jit.si"
  style={{ flex: 1 }}
/>
```

**通过 Ref 控制会议**

```javascript
const jitsiRef = useRef(null);

// 静音/取消静音本地音频
jitsiRef.current?.setAudioMuted(true);
// 关闭/开启本地视频
jitsiRef.current?.setVideoMuted(false);
// 切换纯音频模式
jitsiRef.current?.setAudioOnly(true);
// 退出并关闭会议
jitsiRef.current?.close();

// 获取所有分组房间及参与者信息（含主会议与分组讨论）
const roomsInfo = jitsiRef.current?.getRoomsInfo();
// roomsInfo.rooms[] -> 每个房间的 id / isMainRoom / jid / participants[]
```

**监听会议事件**

```javascript
<JitsiMeeting
  room="testroom123"
  eventListeners={{
    onConferenceWillJoin: () => {},
    onConferenceJoined: () => {},
    onAudioMutedChanged: (muted) => console.log('音频静音:', muted),
    onVideoMutedChanged: (muted) => console.log('视频关闭:', muted),
    onParticipantJoined: (info) => console.log('加入', info?.displayName),
    onParticipantLeft: ({ id }) => console.log('离开', id),
    onEndpointMessageReceived: ({ data, participant }) => {},
    onEnterPictureInPicture: () => {},
    onReadyToClose: () => {},
  }}
/>
```

## 接口说明

> [!TIP] "Platform"列表示该属性在原三方库上支持的平台。

> [!TIP] "HarmonyOS Support"列为 yes 表示 HarmonyOS 平台支持该属性；no 则表示不支持；partially 表示部分支持。使用方法跨平台一致，效果对标 iOS 或 Android 的效果。

本库对外暴露的核心是 `JitsiMeeting` 组件，其 Props、Ref 方法、事件回调及关联类型定义如下。

### 组件 Props

`JitsiMeeting` 组件的 Props（`IAppProps`）：

| Name | Type | Required | Platform | HarmonyOS Support | Description |
| ---- | ---- | -------- | -------- | ------------------ | ----------- |
| room | string | yes | all | yes | 房间名 |
| serverURL | string | no | all | yes | 会议服务器地址（如 `https://meet.jit.si/`） |
| [config](#config) | object | yes | all | yes | 会议配置对象 |
| [flags](#feature-flags) | object | no | all | yes | 功能开关标志位对象 |
| userInfo | [IUserInfo](#iuserinfo) | no | all | yes | 本地用户信息（头像/显示名/邮箱） |
| eventListeners | [IEventListeners](#ieventlisteners) | no | all | yes | 事件回调集合 |
| style | ViewStyle | no | all | yes | 外层 View 的样式 |

### Ref 方法

`JitsiMeeting` 通过 `ref` 暴露的方法（`JitsiRefProps`）：

| Name | Type | Platform | HarmonyOS Support | Description |
| ---- | ---- | -------- | ------------------ | ----------- |
| close | () => void | all | yes | 关闭并退出会议（dispatch appNavigate(undefined)） |
| setAudioOnly | (value: boolean) => void | all | yes | 切换纯音频模式 |
| setAudioMuted | (muted: boolean) => void | all | yes | 静音/取消静音本地音频 |
| setVideoMuted | (muted: boolean) => void | all | yes | 关闭/开启本地视频 |
| getRoomsInfo | () => [IRoomsInfo](#iroomsinfo) | all | yes | 获取当前所有分组房间及参与者信息（含主会议与分组讨论房间） |

### IUserInfo

| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| avatarURL | string | all | yes | 本地用户头像 URL |
| displayName | string | all | yes | 本地用户显示名称 |
| email | string | all | yes | 本地用户邮箱 |

### IRoomsInfo
| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| rooms | [IRoomInfo[]](#iroominfo) | all | yes | 房间信息数组（主会议与各分组讨论房间） |

### IRoomInfo
| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| id | string | all | yes | 房间 ID |
| isMainRoom | boolean | all | yes | 是否为主会议房间 |
| jid | string | all | yes | 房间 JID |
| participants | [IRoomInfoParticipant[]](#iroominfoparticipant) | all | yes | 房间内参与者列表 |

### IRoomInfoParticipant
| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| avatarUrl | string | all | yes | 参与者头像 URL |
| displayName | string | all | yes | 参与者显示名称 |
| id | string | all | yes | 参与者 ID |
| jid | string | all | yes | 参与者 JID |
| role | string | all | yes | 参与者角色 |
| userContext | object | all | yes | 用户上下文 |

### IEventListeners

`eventListeners` Prop 的事件回调集合：

| Name | Type | Platform | HarmonyOS Support | Description |
| ---- | ---- | -------- | ------------------ | ----------- |
| onAudioMutedChanged | `(muted: boolean) => void` | all | yes | 本地音频静音状态变化时触发，muted 为是否静音 |
| onVideoMutedChanged | `(muted: boolean) => void` | all | yes | 本地视频关闭状态变化时触发，muted 为是否关闭 |
| onConferenceBlurred | `() => void` | all | yes | 会议失去焦点时触发 |
| onConferenceFocused | `() => void` | all | yes | 会议获得焦点时触发 |
| onConferenceJoined | `() => void` | all | yes | 已加入会议时触发 |
| onConferenceWillJoin | `() => void` | all | yes | 即将加入会议时触发 |
| onEnterPictureInPicture | `() => void` | all | yes | 进入画中画模式时触发 |
| onEndpointMessageReceived | `({ data, participant }) => void` | all | yes | 收到其他参与者端点消息时触发 |
| onParticipantJoined | `(participantInfo) => void` | all | yes | 参与者加入时触发；participantInfo = { isLocal, email, name, participantId, displayName, avatarUrl, role } |
| onParticipantLeft | `({ id }) => void` | all | yes | 参与者离开时触发，参数为参与者 id |
| onReadyToClose | `() => void` | all | yes | 会议准备关闭时触发（无参数） |

### Feature Flags

`flags` Prop 中的键为下方 value 列的字符串值，对应的常量名为 Flag 列。

#### 音视频

| Flag | value | Default | HarmonyOS Support | Description |
| - | - | - | - | - |
| AUDIO_MUTE_BUTTON_ENABLED | audio-mute.enabled | true | yes | 是否显示音频静音按钮 |
| VIDEO_MUTE_BUTTON_ENABLED | video-mute.enabled | true | yes | 是否显示视频关闭按钮 |
| AUDIO_ONLY_BUTTON_ENABLED | audio-only.enabled | true | yes | 溢出菜单"开启剩流模式"按钮是否启用 |
| AUDIO_DEVICE_BUTTON_ENABLED | audio-device-button.enabled | true | yes | 是否显示音频设备按钮 |
| TOGGLE_CAMERA_BUTTON_ENABLED | toggle-camera-button.enabled | true | yes | 是否启用切换摄像头按钮 |

#### 会议功能

| Flag | value | Default | HarmonyOS Support | Description |
| - | - | - | - | - |
| BREAKOUT_ROOMS_BUTTON_ENABLED | breakout-rooms.enabled | true | yes | 溢出菜单"分组讨论"按钮是否启用 |
| CHAT_ENABLED | chat.enabled | true | yes | 是否启用聊天功能 |
| CONFERENCE_TIMER_ENABLED | conference-timer.enabled | true | yes | 是否启用会议计时器 |
| FILMSTRIP_ENABLED | filmstrip.enabled | true | yes | 是否启用胶片条（侧边参与者栏） |
| INVITE_ENABLED | invite.enabled | true | yes | 是否启用邀请功能 |
| KICK_OUT_ENABLED | kick-out.enabled | true | yes | 是否启用踢出（移除参与者）功能 |
| MEETING_NAME_ENABLED | meeting-name.enabled | true | yes | 是否显示会议名称 |
| MEETING_PASSWORD_ENABLED | meeting-password.enabled | true | yes | 是否启用会议密码按钮 |
| PARTICIPANTS_ENABLED | participants.enabled | true | yes | 是否启用参与者面板 |
| RAISE_HAND_ENABLED | raise-hand.enabled | true | yes | 是否启用举手功能 |
| REACTIONS_ENABLED | reactions.enabled | true | yes | 是否启用表情回应功能 |
| TILE_VIEW_ENABLED | tile-view.enabled | true | yes | 是否启用平铺视图功能 |
| TOOLBOX_ENABLED | toolbox.enabled | true | yes | 是否启用工具箱 |
| TOOLBOX_ALWAYS_VISIBLE | toolbox.alwaysVisible | false | yes | 工具箱是否始终可见 |
| OVERFLOW_MENU_ENABLED | overflow-menu.enabled | true | yes | 是否显示音频溢出菜单按钮 |

#### UI / 导航

| Flag | value | Default | HarmonyOS Support | Description |
| - | - | - | - | - |
| CAR_MODE_ENABLED | car-mode.enabled | true | yes | 是否启用驾驶模式 |
| NOTIFICATIONS_ENABLED | notifications.enabled | true | yes | 是否启用通知 |
| PREJOIN_PAGE_ENABLED | prejoinpage.enabled | true | yes | 是否启用加入前页面 |
| SECURITY_OPTIONS_ENABLED | security-options.enabled | true | yes | 是否启用安全选项按钮 |
| SETTINGS_ENABLED | settings.enabled | true | yes | 是否启用设置 |
| WELCOME_PAGE_ENABLED | welcomepage.enabled | false | yes | 是否启用欢迎页 |
| SPEAKERSTATS_ENABLED | speakerstats.enabled | true | yes | 是否启用发言人统计 |

#### 平台 / 集成

| Flag | value | Default | HarmonyOS Support | Description |
| - | - | - | - | - |
| PIP_ENABLED | pip.enabled | true | yes | 是否启用画中画（PiP） |
| ANDROID_SCREENSHARING_ENABLED | android.screensharing.enabled | true | yes | 是否启用屏幕共享 |

### Config

`config` Prop 的键。

| Key | Type | Default | HarmonyOS Support | Description |
| - | - | - | - | - |
| startWithAudioMuted | boolean | false | yes | 入会即静音本地麦克风 |
| startWithVideoMuted | boolean | false | yes | 入会即关闭摄像头 |
| startAudioOnly | boolean | false | yes | 纯音频模式，不创建视频轨道 |
| startSilent | boolean | false | yes | 静默入场 |
| cameraFacingMode | string | user | yes | 默认摄像头朝向（`user` / `environment`） |
| disableSelfView | boolean | false | yes | 隐藏本地自视图 |
| hideConferenceTimer | boolean | false | yes | 隐藏会议计时器 |
| hideConferenceSubject | boolean | false | yes | 隐藏会议主题 / 房间名标题 |
| subject | string | — | yes | 覆盖会议主题文字 |
| requireDisplayName | boolean | false | yes | 强制要求填显示名才能入会 |

## 遗留问题

- @giphy/react-native-sdk是一个通过网络在GIPHY服务器上搜索相关GIF动图的库，当前没有鸿蒙化，jitsi-meet不实现相关功能。
- jitsi-meet提供的DropboxModule模块是将录制的会议视频上传到Dropbox 云盘，需要有鸿蒙化的Dropbox SDK，目前没有，jitsi-meet不实现相关功能。
- @amplitude/analytics-browser和@amplitude/analytics-react-native没有鸿蒙化实现，jitsi-meet不实现相关功能。
- @react-native-google-signin/google-signin这个谷歌登录模块也没有鸿蒙化实现，jitsi-meet不实现相关功能。
- react-native-splash-view"当前未鸿蒙化，jitsi-meet不实现相关功能。

## 其他

## 目录结构
````
/jitsi-meet  # 项目根目录
├── harmony                          # 鸿蒙适配代码
│    └─ jitsi_meet.har                   # har 包
│    └─ jitsi_meet                       # 鸿蒙适配核心代码
│          └─ Index.ets                  # 鸿蒙适配代码入口
│          └─ ts.ets                     # ArkTS 侧类型导出入口
│          └─ src/main
│              └─ ets
│                  └─ JitsiMeetPackage.ets       # 鸿蒙侧 Package（TurboModule 注册枢纽）
│                  └─ Type.ets                   # 类型定义
│                  └─ modules/                   # ArkTS TurboModule 实现（10 个）
│                      └─ AppInfoModule.ets / AudioModeModule.ets / ConnectionServiceModule.ets
│                      └─ DropboxModule.ets / ExternalAPIModule.ets / JitsiOngoingConferenceModule.ets
│                      └─ LocaleDetectorModule.ets / LogBridgeModule.ets / PictureInPictureModule.ets
│                      └─ ProximityModule.ets
│              └─ cpp
│                  └─ CMakeLists.txt             # C++ 侧构建配置（目标 rnoh_jitsi_meet）
│                  └─ AppInfoTurboModule.cpp/.h / AudioModeTurboModule.cpp/.h
│                  └─ ConnectionServiceTurboModule.cpp/.h / DropboxTurboModule.cpp/.h
│                  └─ ExternalAPITurboModule.cpp/.h / JitsiOngoingConferenceTurboModule.cpp/.h
│                  └─ LocaleDetectorTurboModule.cpp/.h / LogBridgeTurboModule.cpp/.h
│                  └─ PictureInPictureTurboModule.cpp/.h / ProximityTurboModule.cpp/.h
├── react-native-sdk                 # RN SDK（JS 侧 JitsiMeeting 组件来源）
│    └─ index.tsx                        # 入口，导出 JitsiMeeting / JitsiRefProps / IEventListeners 等
│    └─ package.json                     # harmony.autolinking 配置
├── README.md                        # 中文文档
├── README_en.md                     # 英文文档
````

## 贡献代码

使用过程中发现任何问题都可以提交 [Issue](https://github.com/react-native-oh-library/jitsi-meet)，当然，也非常欢迎提交 [PR](https://github.com/react-native-oh-library/jitsi-meet) 。

## 开源协议

本项目基于 [Apache License 2.0](https://github.com/jitsi/jitsi-meet/blob/master/LICENSE) ，请自由地享受和参与开源。
