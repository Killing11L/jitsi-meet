const path = require('path');
const { mergeConfig, getDefaultConfig } = require('@react-native/metro-config');
const {
  createHarmonyMetroConfig,
} = require('@react-native-oh/react-native-harmony/metro.config');
const {
  createJitsiMetroConfig,
} = require('@react-native-ohos/react-native-jitsi/metro.config');

/**
 * @type {import("metro-config").ConfigT}
 *
 * Metro 配置要点:
 * 1. createHarmonyMetroConfig —— 鸿蒙平台 Metro 适配(react-native -> @react-native-oh/react-native-harmony 等)。
 * 2. createJitsiMetroConfig(defaultConfig) —— jitsi SDK 自带,把 110+ 个工具栏 svg
 *    从 asset 通道改走 react-native-svg-transformer,否则渲染报
 *    "Element type is invalid: expected ... but got: number"。
 *    它内部会 require.resolve('react-native-svg-transformer'),故本工程必须安装该依赖。
 * 3. extraNodeModules —— jitsi SDK 的 harmony.alias 是 @jitsi/react-native-sdk,
 *    业务代码 `import { JitsiMeeting } from '@jitsi/react-native-sdk'` 需解析到
 *    安装到 node_modules 的 @react-native-ohos/react-native-jitsi 包。
 */
const config = {
  resolver: {
    extraNodeModules: {
      '@jitsi/react-native-sdk': path.resolve(
        __dirname,
        'node_modules/@react-native-ohos/react-native-jitsi',
      ),
    },
  },
};

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(
  defaultConfig,
  createHarmonyMetroConfig({
    reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony',
  }),
  createJitsiMetroConfig(defaultConfig),
  config
);
