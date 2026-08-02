> Document Template：v0.4.2

<p align="center">
  <h1 align="center"> <code>jitsi-meet</code> </h1>
</p>

This project is based on [jitsi-meet](https://github.com/jitsi/jitsi-meet).

This third-party library has been migrated to Gitcode and is now available for direct download from npm, the new package name is: `@react-native-ohos/react-native-jitsi` (JS alias `@jitsi/react-native-sdk`). The version correspondence details are as follows:

| Library Name | Version (npm) | Release Info | Supported RN Version | Autolink | Compile API Version | Community Baseline Version | Source Code |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-jitsi | ~ 12.1.5 (In development) | [Github Releases](https://github.com/react-native-oh-library/jitsi-meet/releases) | 0.77.* / 0.82.* | Yes | API12+ | 12.1.4 | [Github](https://github.com/react-native-oh-library/jitsi-meet) |

## Introduction

jitsi-meet is an open-source video conferencing solution. This library provides its React Native HarmonyOS adaptation: the `JitsiMeeting` component lets you embed full audio/video conferencing into a RN app, supporting join/leave, audio/video mute, picture-in-picture, breakout rooms, event callbacks, feature flags, and more.

The HarmonyOS side is a **pure ArkTS TurboModule + thin C++ bridge** with no precompiled .so; the underlying media stack (WebRTC, etc.) is provided by the consumer via the corresponding HarmonyOS adapters.

## Installation

Go to the project directory and execute the following instruction:

**npm**

```bash
npm install @react-native-ohos/react-native-jitsi
```

**yarn**

```bash
yarn add @react-native-ohos/react-native-jitsi
```

> [!WARNING] On the JS side it is imported via the alias `@jitsi/react-native-sdk`. This library has many `peerDependencies`; the HarmonyOS adapter of `react-native-webrtc` is **not included** and must be integrated by the consumer, otherwise the conference has no audio/video.

## Link

| | Supported Autolink | Supported RN Version |
| - | - | - |
| ~12.1.5 | Yes | 0.77 / 0.82 |

Projects using AutoLink need to be configured according to this document, AutoLink framework guide: https://gitcode.com/CPF-RN/ohos_react_native/blob/master/docs/zh-cn/Autolinking.md

If the version you are using supports Autolink and the project has integrated Autolink, you can skip the ManualLink configuration.

<details>
  <summary>ManualLink: This step provides guidance for manually configuring native dependencies.</summary>

Open the `harmony` directory of the OpenHarmony project in DevEco Studio.

### 1. Overrides RN SDK

To ensure the project relies on the same version of the RN SDK, you need to add an `overrides` field in the project's root `oh-package.json5` file, specifying the RN SDK version to be used. The replacement version can be a specific version number, a semver range, or a locally available HAR package or source directory.

For more information about the purpose of this field, please refer to the [official documentation](https://developer.huawei.com/consumer/en/doc/harmonyos-guides-V5/ide-oh-package-json5-V5#en-us_topic_0000001792256137_overrides).

```json
{
  "overrides": {
    "@rnoh/react-native-openharmony": "^0.82.30" // ohpm version
    // "@rnoh/react-native-openharmony" : "./react_native_openharmony.har" // a locally available HAR package
    // "@rnoh/react-native-openharmony" : "./react_native_openharmony" // source code directory
  }
}
```

### 2. Introducing Native Code

Currently, two methods are available:

1. Use the HAR file (this method will be deprecated once the IDE fully supports the relevant features; currently this is the preferred method).
2. Directly link to the source code.

Method 1 (recommended): Use the HAR file.

> [!TIP] The HAR file is stored in the `harmony` directory in the installation path of the third-party library.

Open `entry/oh-package.json5` and add the following dependencies:

```json
"dependencies": {
    "@rnoh/react-native-openharmony": "file:../react_native_openharmony",
    "@react-native-ohos/react-native-jitsi": "file:../../node_modules/@react-native-ohos/react-native-jitsi/harmony/jitsi_meet.har"
  }
```

Click the `sync` button in the upper right corner.

Alternatively, run the following instruction on the terminal:

```bash
cd entry
ohpm install
```

Method 2: Directly link to the source code.

> [!TIP] For details on directly linking the source code, see [Directly Linking Source Code](https://gitcode.com/CPF-RN/usage-docs/blob/master/en/link-source-code.md).

### 3. Configuring CMakeLists and Introducing JitsiMeetPackage

> If the project has integrated RNOH AutoLink and this library's `harmony.autolinking` config is in effect, the CMake and `PackageProvider` registration can be generated automatically by AutoLink; this manual section can be skipped.

Open `entry/src/main/cpp/CMakeLists.txt` and add:

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

> [!Tip] Note: the HarmonyOS side of jitsi is a pure ArkTS TurboModule + thin C++ bridge. The CMake target `rnoh_jitsi_meet` links only `rnoh`, `libace_napi.z.so`, and `libhilog_ndk.z.so`; no third-party .so is needed. The WebRTC media capability is provided by the consumer-integrated HarmonyOS adapter of `react-native-webrtc`.

Open `entry/src/main/cpp/PackageProvider.cpp` and add:

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

### 4. Introducing JitsiMeetPackage to ArkTS

Open `entry/src/main/ets/RNPackagesFactory.ts` or `entry/src/main/ets/rn/RNPackagesFactory.ts` and add:

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

### 5. metro.config.js Configuration
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

### Running

Click the `sync` button in the upper right corner.

Alternatively, run the following instruction on the terminal:

```bash
cd entry
ohpm install
```

Then build and run the code.

## Constraints

### Compatibility

To use this repository, you need to use the correct React-Native and RNOH versions. In addition, you need to use DevEco Studio and the ROM on your phone.

This document is verified based on the following versions:

1. RNOH: 0.82.1; SDK: HarmonyOS API Version 21 Release SDK; IDE: DevEco Studio 6.0.1.260; ROM: 6.0.0.130;

### Permission Requirements

Conferencing involves audio/video capture, network access, and picture-in-picture. Configure the corresponding permissions in `entry/src/main/module.json5`:

- Network access and audio/video capture require the network, microphone, and camera permissions;
- Picture-in-picture / background keep-alive requires configuring `backgroundModes: ["voip"]` for `EntryAbility`.

In `entry/src/main/module.json5`:

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

### Compile & Run API Requirements

> [!TIP] All versions of the current third-party library implement version isolation, supporting compilation in `API12+` projects and running on `API12+` ROMs.

## Example
The following code shows the basic use scenario of the repository:

> [!WARNING] The name of the imported repository remains unchanged. On the JS side, `JitsiMeeting` is imported via `@jitsi/react-native-sdk`.

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
                    onConferenceJoined: () => console.log('Joined the conference'),
                    onConferenceWillJoin: () => console.log('Will join the conference'),
                    onParticipantJoined: (p) => console.log('Participant joined', p?.displayName),
                    onParticipantLeft: ({ id }) => console.log('Participant left', id),
                    onReadyToClose: () => console.log('Conference ready to close'),
                }}
            />
            <Button title="Mute" onPress={() => jitsiRef.current?.setAudioMuted(true)} />
            <Button title="Mute Video" onPress={() => jitsiRef.current?.setVideoMuted(true)} />
            <Button title="Leave" onPress={() => jitsiRef.current?.close()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    meet: { flex: 1 },
});
```

## How to Use

> [!TIP] jitsi-meet is a full video conferencing SDK; the `JitsiMeeting` component renders the entire conference UI internally. The HarmonyOS side is a pure ArkTS TurboModule with no media .so such as WebRTC; audio/video is available only after the consumer integrates the HarmonyOS adapter of `react-native-webrtc`.

**Initialize a conference**

```javascript
import { JitsiMeeting } from '@jitsi/react-native-sdk';

// When room contains '://', it is parsed as a full conference URL (serverURL is ignored); otherwise it is joined with serverURL
<JitsiMeeting
  room="testroom123"
  serverURL="https://meet.jit.si"
  style={{ flex: 1 }}
/>
```

**Control the conference via Ref**

```javascript
const jitsiRef = useRef(null);

// Mute / unmute local audio
jitsiRef.current?.setAudioMuted(true);
// Turn off / on local video
jitsiRef.current?.setVideoMuted(false);
// Toggle audio-only mode
jitsiRef.current?.setAudioOnly(true);
// Leave and close the conference
jitsiRef.current?.close();

// Get all breakout rooms and participant info (including the main room and breakout rooms)
const roomsInfo = jitsiRef.current?.getRoomsInfo();
// roomsInfo.rooms[] -> each room's id / isMainRoom / jid / participants[]
```

**Listen to conference events**

```javascript
<JitsiMeeting
  room="testroom123"
  eventListeners={{
    onConferenceWillJoin: () => {},
    onConferenceJoined: () => {},
    onAudioMutedChanged: (muted) => console.log('audio muted:', muted),
    onVideoMutedChanged: (muted) => console.log('video muted:', muted),
    onParticipantJoined: (info) => console.log('joined', info?.displayName),
    onParticipantLeft: ({ id }) => console.log('left', id),
    onEndpointMessageReceived: ({ data, participant }) => {},
    onEnterPictureInPicture: () => {},
    onReadyToClose: () => {},
  }}
/>
```

## Available APIs

> [!TIP] The **Platform** column indicates the platform where the properties are supported in the original third-party library.

> [!TIP] If the value of **HarmonyOS Support** is **yes**, it means that the HarmonyOS platform supports this property; **no** means the opposite; **partially** means some capabilities of this property are supported. The usage method is the same on different platforms and the effect is the same as that of iOS or Android.

The core exposed by this library is the `JitsiMeeting` component; its Props, Ref methods, event callbacks, and the related type definitions are as follows.

### Component Props

Props of the `JitsiMeeting` component (`IAppProps`):

| Name | Type | Required | Platform | HarmonyOS Support | Description |
| ---- | ---- | -------- | -------- | ------------------ | ----------- |
| room | string | yes | all | yes | Room name |
| serverURL | string | no | all | yes | Conference server address (e.g. `https://meet.jit.si/`) |
| [config](#config) | object | yes | all | yes | Conference configuration object |
| [flags](#feature-flags) | object | no | all | yes | Feature flag object |
| userInfo | [IUserInfo](#iuserinfo) | no | all | yes | Local user info (avatar / display name / email) |
| eventListeners | [IEventListeners](#ieventlisteners) | no | all | yes | Event callback set |
| style | ViewStyle | no | all | yes | Style of the outer View |

### Ref Methods

Methods exposed by `JitsiMeeting` via `ref` (`JitsiRefProps`):

| Name | Type | Platform | HarmonyOS Support | Description |
| ---- | ---- | -------- | ------------------ | ----------- |
| close | `() => void` | all | yes | Close and leave the conference (dispatch appNavigate(undefined)) |
| setAudioOnly | `(value: boolean) => void` | all | yes | Toggle audio-only mode |
| setAudioMuted | `(muted: boolean) => void` | all | yes | Mute / unmute local audio |
| setVideoMuted | `(muted: boolean) => void` | all | yes | Turn off / on local video |
| getRoomsInfo | `() => IRoomsInfo` | all | yes | Get all breakout rooms and participant info (including the main conference room and breakout rooms) |

### IUserInfo

| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| avatarURL | string | all | yes | Local user avatar URL |
| displayName | string | all | yes | Local user display name |
| email | string | all | yes | Local user email |

### IRoomsInfo
| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| rooms | [IRoomInfo[]](#iroominfo) | all | yes | Room info array (main conference room and each breakout room) |

### IRoomInfo
| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| id | string | all | yes | Room ID |
| isMainRoom | boolean | all | yes | Whether it is the main conference room |
| jid | string | all | yes | Room JID |
| participants | [IRoomInfoParticipant[]](#iroominfoparticipant) | all | yes | Participant list in this room |

### IRoomInfoParticipant
| Name | Type | Platform | HarmonyOS Support | Description |
| - | - | - | - | - |
| avatarUrl | string | all | yes | Participant avatar URL |
| displayName | string | all | yes | Participant display name |
| id | string | all | yes | Participant ID |
| jid | string | all | yes | Participant JID |
| role | string | all | yes | Participant role |
| userContext | object | all | yes | User context |

### IEventListeners

Event callbacks of the `eventListeners` Prop:

| Name | Type | Platform | HarmonyOS Support | Description |
| ---- | ---- | -------- | ------------------ | ----------- |
| onAudioMutedChanged | `(muted: boolean) => void` | all | yes | Fired when local audio mute state changes; muted indicates whether muted |
| onVideoMutedChanged | `(muted: boolean) => void` | all | yes | Fired when local video mute state changes; muted indicates whether off |
| onConferenceBlurred | `() => void` | all | yes | Fired when the conference loses focus |
| onConferenceFocused | `() => void` | all | yes | Fired when the conference gains focus |
| onConferenceJoined | `() => void` | all | yes | Fired when the conference has been joined |
| onConferenceWillJoin | `() => void` | all | yes | Fired when about to join the conference |
| onEnterPictureInPicture | `() => void` | all | yes | Fired when entering picture-in-picture mode |
| onEndpointMessageReceived | `({ data, participant }) => void` | all | yes | Fired when an endpoint message from another participant is received |
| onParticipantJoined | `(participantInfo) => void` | all | yes | Fired when a participant joins; participantInfo = { isLocal, email, name, participantId, displayName, avatarUrl, role } |
| onParticipantLeft | `({ id }) => void` | all | yes | Fired when a participant leaves; the arg is the participant id |
| onReadyToClose | `() => void` | all | yes | Fired when the conference is about to close (no args) |

### Feature Flags

The keys of the `flags` Prop are the flag string values below.

#### Audio / Video

| Flag | Default | Description |
| ---- | ------- | ----------- |
| audio-mute.enabled | true | Whether to show the audio mute button |
| video-mute.enabled | true | Whether to show the video mute button |
| audio-only.enabled | true | Whether the "audio only" button in the overflow menu is enabled |
| audio-device-button.enabled | true | Whether to show the audio device button |
| toggle-camera-button.enabled | true | Whether to enable the toggle camera button |

#### Conference Features

| Flag | Default | Description |
| ---- | ------- | ----------- |
| breakout-rooms.enabled | true | Whether the "breakout rooms" button in the overflow menu is enabled |
| chat.enabled | true | Whether to enable chat |
| conference-timer.enabled | true | Whether to enable the conference timer |
| filmstrip.enabled | true | Whether to enable the filmstrip (side participant bar) |
| invite.enabled | true | Whether to enable invite |
| kick-out.enabled | true | Whether to enable kicking out participants |
| meeting-name.enabled | true | Whether to show the meeting name |
| meeting-password.enabled | true | Whether to enable the meeting password button |
| participants.enabled | true | Whether to enable the participants panel |
| raise-hand.enabled | true | Whether to enable raise hand |
| reactions.enabled | true | Whether to enable emoji reactions |
| tile-view.enabled | true | Whether to enable tile view |
| toolbox.enabled | true | Whether to enable the toolbox |
| toolbox.alwaysVisible | false | Whether the toolbox is always visible |
| overflow-menu.enabled | true | Whether to show the audio overflow menu button |

#### UI / Navigation

| Flag | Default | Description |
| ---- | ------- | ----------- |
| car-mode.enabled | true | Whether to enable car mode |
| notifications.enabled | true | Whether to enable notifications |
| prejoinpage.enabled | true | Whether to enable the pre-join page |
| security-options.enabled | true | Whether to enable the security options button |
| server-url-change.enabled | true | Whether changing the server URL is allowed |
| settings.enabled | true | Whether to enable settings |
| welcomepage.enabled | false | Whether to enable the welcome page |
| speakerstats.enabled | true | Whether to enable speaker stats |

#### Platform / Integration

| Flag | Default | Description |
| ---- | ------- | ----------- |
| pip.enabled | auto-detected | Whether to enable picture-in-picture (PiP) |
| android.screensharing.enabled | true | Whether to enable screen sharing |
| replace.participant | false | Whether to use the replaceParticipant feature when joining a conference |

### Config

The keys of the `config` Prop.

| Key | Type | Default | Description |
| --- | ---- | ------- | ----------- |
| startWithAudioMuted | boolean | false | Mute local mic on join |
| startWithVideoMuted | boolean | false | Turn off camera on join |
| startAudioOnly | boolean | false | Audio-only mode, no video track |
| startSilent | boolean | false | Join silently |
| cameraFacingMode | string | user | Default camera facing (`user` / `environment`) |
| disableSelfView | boolean | false | Hide local self-view |
| hideConferenceTimer | boolean | false | Hide conference timer |
| hideConferenceSubject | boolean | false | Hide conference subject / room name title |
| subject | string | — | Override conference subject text |
| requireDisplayName | boolean | — | Require display name before joining |

## Known Issues

## Other

## Directory Structure
````
/jitsi-meet  # Project root directory
├── harmony                          # HarmonyOS adaptation code
│    └─ jitsi_meet.har                   # har package
│    └─ jitsi_meet                       # HarmonyOS adaptation core code
│          └─ Index.ets                  # HarmonyOS adaptation code entry point
│          └─ ts.ets                     # ArkTS type export entry
│          └─ src/main
│              └─ ets
│                  └─ JitsiMeetPackage.ets       # HarmonyOS-side Package (TurboModule registration hub)
│                  └─ Type.ets                   # Type definitions
│                  └─ modules/                   # ArkTS TurboModule implementations (10)
│                      └─ AppInfoModule.ets / AudioModeModule.ets / ConnectionServiceModule.ets
│                      └─ DropboxModule.ets / ExternalAPIModule.ets / JitsiOngoingConferenceModule.ets
│                      └─ LocaleDetectorModule.ets / LogBridgeModule.ets / PictureInPictureModule.ets
│                      └─ ProximityModule.ets
│              └─ cpp
│                  └─ CMakeLists.txt             # C++-side build configuration (target rnoh_jitsi_meet)
│                  └─ AppInfoTurboModule.cpp/.h / AudioModeTurboModule.cpp/.h
│                  └─ ConnectionServiceTurboModule.cpp/.h / DropboxTurboModule.cpp/.h
│                  └─ ExternalAPITurboModule.cpp/.h / JitsiOngoingConferenceTurboModule.cpp/.h
│                  └─ LocaleDetectorTurboModule.cpp/.h / LogBridgeTurboModule.cpp/.h
│                  └─ PictureInPictureTurboModule.cpp/.h / ProximityTurboModule.cpp/.h
├── react-native-sdk                 # RN SDK (JS-side source of the JitsiMeeting component)
│    └─ index.tsx                        # Entry, exports JitsiMeeting / JitsiRefProps / IEventListeners, etc.
│    └─ package.json                     # harmony.autolinking config
├── README.md                        # Chinese document
├── README_en.md                     # English document
````

## How to Contribute

If you find any problem when using the repository, submit an [Issue](https://github.com/react-native-oh-library/jitsi-meet). Pull requests are also welcome via [PR](https://github.com/react-native-oh-library/jitsi-meet).

## License

The repository is based on [Apache License 2.0](https://github.com/jitsi/jitsi-meet/blob/master/LICENSE), feel free to use and contribute to the open source project.
