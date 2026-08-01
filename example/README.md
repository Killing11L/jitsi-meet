# react-native-jitsi example（鸿蒙）

测试 `react-native-ohos-react-native-jitsi-2.0.11032-rc.1.tgz` 在鸿蒙（HarmonyOS）下的最小工程。

工程结构参照 `rntpc_react-native-sound/example`，测试页面取自 `25P1_3/rn-tester/examples/react-native-jitsi/App.tsx`（全量接口测试 demo：props / ref / eventListeners + 9 个原生 TurboModule）。

## 目录结构

```
example/
├── package.json              # 依赖：jitsi tgz(file:../react-native-sdk/..) + webrtc 等 peer
├── metro.config.js           # 合并 createHarmonyMetroConfig + createJitsiMetroConfig
├── index.js / app.json       # RN JS 入口（appKey: app_name）
├── src/App.tsx               # 测试页面（JitsiMeeting 全量接口测试）
├── scripts/create-build-profile.js  # postinstall：从模板生成 harmony/build-profile.json5
└── harmony/                  # 鸿蒙原生工程
    ├── oh-package.json5      # overrides：@rnoh/react-native-openharmony -> framework HAR
    ├── build-profile.template.json5  # modules 含 jitsi_meet(srcPath 指源码目录)
    └── entry/                # HAP 主模块
        ├── src/main/cpp/CMakeLists.txt     # 不链接 jitsi cpp（纯 ArkTS 库）
        ├── src/main/cpp/PackageProvider.cpp # 只注册 RNOHGeneratedPackage
        ├── src/main/ets/RNPackagesFactory.ets # new JitsiMeetPackage(ctx)
        ├── src/main/ets/entryability/EntryAbility.ets
        └── src/main/ets/pages/Index.ets   # RNApp 渲染入口
```

## 关键设计决策

1. **jitsi 是纯 ArkTS TurboModule 库**：`JitsiMeetPackage` 全在 ArkTS 侧（见 `react-native-sdk/harmony/jitsi_meet/src/main/ets/JitsiMeetPackage.ets`，无自定义 cpp 组件）。因此：
   - `entry/cpp/PackageProvider.cpp` **不**注册 jitsi 的 cpp Package；
   - `entry/cpp/CMakeLists.txt` **不** `add_subdirectory` jitsi 的 cpp；
   - 只在 `entry/ets/RNPackagesFactory.ets` 里 `new JitsiMeetPackage(ctx)` 接入 9 个 TurboModule（AppInfo / AudioMode / ExternalAPI / ConnectionService / LocaleDetector / LogBridge / PictureInPicture / Proximity / JMOngoingConference）。
   - 这与 sound example（有 C++ Package）不同，cpp 侧被简化。

2. **jitsi_meet 模块通过 srcPath 纳入编译**：`build-profile.template.json5` 的 modules 里 `jitsi_meet` 模块 `srcPath: '../../react-native-sdk/harmony/jitsi_meet'`，直接引源码目录，改源码即生效。

3. **webrtc 写版本号**：`@react-native-ohos/react-native-webrtc: 124.0.8-rc.10` 从 npm 安装（非本地 tgz）。

4. **react-native-harmony 框架版本**：`0.82.30`（与 25P1_3 一致）。

## 使用步骤

```bash
# 1. 安装依赖（必须 --legacy-peer-deps，jitsi peer 极重且多处冲突）
cd D:/work_file/tpc/jitsi-meet/jitsi-meet-oh/example
npm install --legacy-peer-deps

# 2. 生成鸿蒙 build-profile（postinstall 已自动执行，可手动重跑）
node ./scripts/create-build-profile

# 3. codegen（生成 cpp TurboModule 桥接到 harmony/entry/src/main/cpp/generated）
npm run codegen

# 4. 打包 JS bundle 到鸿蒙
npm run dev          # debug
# 或 npm run prod    # release

# 5. 用 DevEco Studio 打开 harmony/ 目录构建 HAP 并安装到真机
#    首次需在 build-profile.json5 配置签名（signingConfigs）

# 6. Metro 实时调试（可选）
npm start
```

## metro.config.js 说明

同时合并三段配置：
- `createHarmonyMetroConfig` —— 鸿蒙平台适配；
- `createJitsiMetroConfig(defaultConfig)` —— jitsi 自带，把 110+ 个工具栏 svg 改走 `react-native-svg-transformer`（否则 svg 走 asset 通道拿到数字资源 id，运行时报 "Element type is invalid: expected ... but got: number"）。它内部 `require.resolve('react-native-svg-transformer')`，故本工程已声明该依赖；
- `extraNodeModules` —— 把 `@jitsi/react-native-sdk`（jitsi 的 harmony.alias）映射到 `node_modules/@react-native-ohos/react-native-jitsi`。

## 已知风险点（需真机构建时验证）

### jitsi_meet 模块 framework HAR 依赖解析

`react-native-sdk/harmony/jitsi_meet/oh-package.json5` 写着：
```
"@rnoh/react-native-openharmony": "file:../../node_modules/@react-native-oh/react-native-harmony/react_native_openharmony.har"
```
该路径相对于 `jitsi_meet` 目录解析，往上两级指向 `react-native-sdk/node_modules/`，而本工程 framework HAR 装在 `example/node_modules/`。

- 若 hvigor 从 jitsi_meet 模块自身路径解析此 `file:` 引用，将找不到 HAR，报 `@rnoh/react-native-openharmony` 未解析；
- example 的 `harmony/oh-package.json5` 已用 `overrides` 把 `@rnoh/react-native-openharmony` 指向 example 的 `node_modules` 里的 framework HAR，期望 hvigor 优先用 overrides 注入。sound example 走的就是这条路（sound 模块自身不写 framework 依赖，靠 overrides 注入）。

若构建报 framework 找不到，处理方式：
1. 确认 `npm install` 后 `example/node_modules/@react-native-oh/react-native-harmony/react_native_openharmony.har` 确实存在；
2. 若 overrides 未生效，考虑在 `react-native-sdk/harmony/jitsi_meet/oh-package.json5` 把 `file:` 路径改成指向 example 的 node_modules（需相对 jitsi_meet 往上四级：`../../../../example/node_modules/...`），或把 jitsi_meet 的该依赖删除让其完全靠宿主 overrides。

### webrtc 等版本漂移

jitsi SDK `peerDependencies` 里 webrtc 是 `124.0.7`，本工程按你要求写 `124.0.8-rc.10`。若两者接口签名有差异导致运行时报错，需回退到 `124.0.7` 对应的鸿蒙适配版本。

### 真机入会需额外条件

入会需真实 jitsi 服务器、网络、麦克风/摄像头权限授予。本工程已声明 INTERNET/MICROPHONE/CAMERA 权限，但运行时还需在系统设置授予。默认连接 `https://meet.jit.si`，房间名 `huxiaotest`（见 App.tsx，可改）。

## 测试页面来源

`src/App.tsx` 来自 `D:/rnt_82_1/25P1_3/rn-tester/examples/react-native-jitsi/App.tsx`，
原文件导出的是 rn-tester 注册对象（`{ displayName, examples }`），
本工程改为独立 RN app 入口，故将其末尾改为 `export default JitsiMeetingDemo`（直接导出 React 组件），
并新增 `src/index.tsx` 透传默认导出，供 `index.js` 的 `AppRegistry.registerComponent` 使用。
