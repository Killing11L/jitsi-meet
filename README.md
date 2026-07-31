> 文档模板：v0.4.2

<p align="center">
  <h1 align="center"> <code>jitsi-meet</code> </h1>
</p>

本项目基于 [jitsi-meet](https://github.com/jitsi/jitsi-meet) 开发。

该第三方库的仓库已迁移至 Gitcode，且支持直接从 npm 下载，新的包名为：`@react-native-ohos/react-native-jitsi`（JS 别名 `@jitsi/react-native-sdk`），版本所属关系如下：

| 三方库名称 | 三方库版本（npm地址） | 发布信息 | 支持RN版本 | Autolink | 编译API版本 | 社区基线版本 | 源码地址 |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-jitsi | [~ 2.0.11031](http://149.88.69.92:4873/-/web/detail/@react-native-ohos/react-native-jitsi) | [Github Releases](https://github.com/react-native-oh-library/jitsi-meet/releases) | 0.77.* / 0.82.* | 是 | API12+ | 2.0.11031 | [Github](https://github.com/react-native-oh-library/jitsi-meet) |

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
| ~2.0.11031 | 是 | 0.77 / 0.82 |

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
+    resolver: {
+        unstable_enablePackageExports: true,
+    },
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
| close | `() => void` | all | yes | 关闭并退出会议（dispatch appNavigate(undefined)） |
| setAudioOnly | `(value: boolean) => void` | all | yes | 切换纯音频模式 |
| setAudioMuted | `(muted: boolean) => void` | all | yes | 静音/取消静音本地音频 |
| setVideoMuted | `(muted: boolean) => void` | all | yes | 关闭/开启本地视频 |
| getRoomsInfo | `() => IRoomsInfo` | all | yes | 获取当前所有分组房间及参与者信息（含主会议与分组讨论房间） |

### 类型定义

接口间存在层级包含关系：`getRoomsInfo()` 返回 `IRoomsInfo`，其 `rooms` 为 `IRoomInfo[]`，每个 `IRoomInfo` 又包含 `IRoomInfoParticipant[]`。层级关系如下：

```
IRoomsInfo
 └─ rooms: IRoomInfo[]
     ├─ id / isMainRoom / jid
     └─ participants: IRoomInfoParticipant[]
         ├─ avatarUrl / displayName / id / jid / role
         └─ userContext?
```

```typescript
/** 本地用户信息 */
interface IUserInfo {
  avatarURL?: string;   // 本地用户头像 URL
  displayName?: string; // 本地用户显示名称
  email?: string;       // 本地用户邮箱
}

/** 房间内单个参与者信息 */
interface IRoomInfoParticipant {
  avatarUrl: string;       // 参与者头像 URL
  displayName: string;    // 参与者显示名称
  id: string;              // 参与者 ID
  jid: string;             // 参与者 JID
  role: string;            // 参与者角色（如 moderator / participant）
  userContext?: object;    // 用户上下文（含可选 id / name）
}

/** 单个房间信息（主会议或分组讨论房间） */
interface IRoomInfo {
  id: string;                       // 房间 ID
  isMainRoom: boolean;              // 是否为主会议房间
  jid: string;                      // 房间 JID
  participants: IRoomInfoParticipant[]; // 该房间内参与者列表
}

/** 所有分组房间及参与者信息（getRoomsInfo() 返回值） */
interface IRoomsInfo {
  rooms: IRoomInfo[]; // 房间信息数组
}
```

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

`flags` Prop 中的键为下方 flag 字符串值。

#### 音视频

| Flag | Default | Description |
| ---- | ------- | ----------- |
| audio-mute.enabled | true | 是否显示音频静音按钮 |
| video-mute.enabled | true | 是否显示视频关闭按钮 |
| audio-only.enabled | true | 溢出菜单"开启剩流模式"按钮是否启用 |
| audio-device-button.enabled | true | 是否显示音频设备按钮 |
| toggle-camera-button.enabled | true | 是否启用切换摄像头按钮 |

#### 会议功能

| Flag | Default | Description |
| ---- | ------- | ----------- |
| breakout-rooms.enabled | true | 溢出菜单"分组讨论"按钮是否启用 |
| chat.enabled | true | 是否启用聊天功能 |
| conference-timer.enabled | true | 是否启用会议计时器 |
| filmstrip.enabled | true | 是否启用胶片条（侧边参与者栏） |
| invite.enabled | true | 是否启用邀请功能 |
| kick-out.enabled | true | 是否启用踢出（移除参与者）功能 |
| meeting-name.enabled | true | 是否显示会议名称 |
| meeting-password.enabled | true | 是否启用会议密码按钮 |
| participants.enabled | true | 是否启用参与者面板 |
| raise-hand.enabled | true | 是否启用举手功能 |
| reactions.enabled | true | 是否启用表情回应功能 |
| tile-view.enabled | true | 是否启用平铺视图功能 |
| toolbox.enabled | true | 是否启用工具箱 |
| toolbox.alwaysVisible | false | 工具箱是否始终可见 |
| overflow-menu.enabled | true | 是否显示音频溢出菜单按钮 |

#### UI / 导航

| Flag | Default | Description |
| ---- | ------- | ----------- |
| calendar.enabled | true | 是否启用日历集成 |
| car-mode.enabled | true | 是否启用驾驶模式 |
| notifications.enabled | true | 是否启用通知 |
| prejoinpage.enabled | true | 是否启用加入前页面 |
| security-options.enabled | true | 是否启用安全选项按钮 |
| server-url-change.enabled | true | 是否允许更改服务器 URL |
| settings.enabled | true | 是否启用设置 |
| welcomepage.enabled | false | 是否启用欢迎页 |
| speakerstats.enabled | true | 是否启用发言人统计 |

#### 平台 / 集成

| Flag | Default | Description |
| ---- | ------- | ----------- |
| pip.enabled | auto-detected | 是否启用画中画（PiP） |
| android.screensharing.enabled | true | 是否启用屏幕共享 |
| replace.participant | false | 用户加入会议时是否使用 replaceParticipant 功能 |

### Config

`config` Prop 的键。

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| startWithAudioMuted | boolean | false | 入会即静音本地麦克风 |
| startWithVideoMuted | boolean | false | 入会即关闭摄像头 |
| startAudioOnly | boolean | false | 纯音频模式，不创建视频轨道 |
| startSilent | boolean | false | 静默入场 |
| cameraFacingMode | string | user | 默认摄像头朝向（`user` / `environment`） |
| disableSelfView | boolean | false | 隐藏本地自视图 |
| hideConferenceTimer | boolean | false | 隐藏会议计时器 |
| hideConferenceSubject | boolean | false | 隐藏会议主题 / 房间名标题 |
| subject | string | — | 覆盖会议主题文字 |
| requireDisplayName | boolean | — | 强制要求填显示名才能入会 |

## 遗留问题

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
