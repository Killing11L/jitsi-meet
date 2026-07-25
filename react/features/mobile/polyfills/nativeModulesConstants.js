/**
 * 鸿蒙 RN TurboModule 常量适配 polyfill。
 *
 * 背景：RN 新架构下 TurboModule 不再自动注入常量属性。
 * - iOS/android：模块继承 RCTBridgeModule / ReactContextBaseJavaModule，
 *   框架(含 android interop 兼容层)在注册时自动调用 getConstants()
 *   并把返回对象的每个 key 挂成 NativeModules.X.key 的属性，
 *   故 jitsi JS 可直接 `NativeModules.AppInfo.LIBRE_BUILD`。
 * - 鸿蒙：模块是纯新架构 ArkTSTurboModule，getConstants() 只是
 *   methodMap_ 里的普通方法，必须显式调用才能拿到值，直接读属性为 undefined。
 *
 * 本 polyfill 在 app 启动早期把鸿蒙 TurboModule 的 getConstants() 返回值
 * 平铺成模块对象的直接属性，从而让 jitsi 既有 JS 代码(几十处
 * `NativeModules.X.常量` 读取)在鸿蒙下原样工作，无需逐文件修改。
 *
 * 仅在鸿蒙平台生效；iOS/android/web 无副作用。
 */
import { NativeModules, Platform } from 'react-native';

// 仅鸿蒙需要适配。其它平台 getConstants 已由框架自动注入。
if (Platform.OS === 'harmony') {
    // 涉及常量读取的模块清单(与 jitsi JS 实际读取点一一对应)。
    const MODULES_WITH_CONSTANTS = [
        'AppInfo',
        'AudioMode',
        'ExternalAPI',
        'PictureInPicture',
        'Dropbox',
        'LocaleDetector'
    ];

    for (const name of MODULES_WITH_CONSTANTS) {
        const mod = NativeModules[name];

        // 模块未注册(鸿蒙侧未提供该模块)时跳过,不阻断启动。
        if (!mod || typeof mod.getConstants !== 'function') {
            continue;
        }

        try {
            const constants = mod.getConstants();

            // 把每个常量平铺成模块的直接属性。已存在的同名方法属性不覆盖。
            for (const key of Object.keys(constants)) {
                if (mod[key] === undefined) {
                    mod[key] = constants[key];
                }
            }
        } catch (e) {
            // getConstants 调用失败不阻断,常量相关功能降级为 undefined。
        }
    }

    // 关闭标志位,供调试确认 polyfill 已执行。
    global.JITSI_HARMONY_CONSTANTS_PATCHED = true;
}
