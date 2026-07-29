/**
 * Jitsi Meet React Native SDK —— Metro 配置工厂
 *
 * 封装 jitsi 对 Metro 的依赖(svg-transformer),让接入方【无需手写】svg 处理配置。
 * 库升级时本文件自动跟进,接入方的 metro.config.js 无需随之改动。
 *
 * 用法(接入方 metro.config.js):
 *   const { mergeConfig, getDefaultConfig } = require('@react-native/metro-config');
 *   const { createHarmonyMetroConfig } = require('@react-native-oh/react-native-harmony/metro.config');
 *   const { createJitsiMetroConfig } = require('@react-native-ohos/react-native-jitsi/metro.config');
 *
 *   const defaultConfig = getDefaultConfig(__dirname);
 *   module.exports = mergeConfig(
 *     defaultConfig,
 *     createHarmonyMetroConfig({ reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony' }),
 *     createJitsiMetroConfig(defaultConfig)
 *   );
 *
 * 为什么需要: jitsi 工具栏(110+ 图标)以 `import x from './x.svg'` 形式引入,
 * 依赖 react-native-svg-transformer 把 .svg 编译成 React 组件。若不配,svg 会
 * 走默认 asset 通道,import 拿到的是数字资源 id,渲染时报
 * "Element type is invalid: expected ... but got: number"。
 *
 * 关于 React Navigation 多副本: 本库已通过 package.json 的 bundleDependencies
 * 把 v6 navigation 全家桶打入 tarball,宿主 npm install 时就地解压、不参与 hoist,
 * 与宿主 v7 隔离 —— 故接入方【无需】为 navigation 配置 metro resolveRequest。
 */

/**
 * 生成 jitsi 所需的 Metro 配置片段(仅 svg-transformer 相关)。
 *
 * @param {object} defaultConfig 接入方 getDefaultConfig(__dirname) 的返回值,
 *   用于继承该工程既有的 assetExts / sourceExts(避免覆盖宿主其它扩展名配置)。
 * @returns {object} 配置片段对象,传入 mergeConfig(...) 合并即可。
 */
function createJitsiMetroConfig(defaultConfig) {
    let babelTransformerPath;

    try {
        // 运行于宿主 Metro 进程;Node 从本文件所在包目录向上查找 node_modules,
        // 命中 npm 为本库(或宿主顶层 hoist)安装的 react-native-svg-transformer。
        babelTransformerPath = require.resolve('react-native-svg-transformer');
    } catch {
        throw new Error(
            '[react-native-jitsi] 未找到 react-native-svg-transformer。'
            + '请在本工程执行 `npm i react-native-svg-transformer` 后重试。'
        );
    }

    const baseResolver = (defaultConfig && defaultConfig.resolver) || {};
    const assetExts = baseResolver.assetExts || [];
    const sourceExts = baseResolver.sourceExts || [];

    return {
        transformer: {
            babelTransformerPath,
            getTransformOptions: async () => ({
                transform: {
                    experimentalImportSupport: false,
                    inlineRequires: true
                }
            })
        },
        resolver: {
            // svg 不再作为 asset(数字 id),改由 svg-transformer 转成可渲染组件。
            assetExts: assetExts.filter(ext => ext !== 'svg'),
            sourceExts: [ ...sourceExts, 'svg' ]
        }
    };
}

module.exports = { createJitsiMetroConfig };
