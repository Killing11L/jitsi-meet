import { Alert, Linking, NativeModules } from 'react-native';

import Platform from '../../base/react/Platform.native';

/**
 * Opens the settings panel for the current platform.
 *
 * @private
 * @returns {void}
 */
export function openSettings() {
    switch (Platform.OS) {
    case 'android':
        NativeModules.AndroidSettings.open().catch(() => {
            Alert.alert(
                'Error opening settings',
                'Please open settings and grant the required permissions',
                [
                    { text: 'OK' }
                ]
            );
        });
        break;

    case 'ios':
        Linking.openURL('app-settings:');
        break;

    case 'harmony':
        // 鸿蒙无 AndroidSettings 等价原生模块,复用 RN 内置 Linking.openSettings()
        // (由 @react-native-oh/react-native-harmony 实现,跳转应用权限设置页)。
        // 与 react-native-webrtc 鸿蒙 demo 一致。失败时回退提示用户手动开启。
        Linking.openSettings().catch(() => {
            Alert.alert(
                'Error opening settings',
                'Please open settings and grant the required permissions',
                [
                    { text: 'OK' }
                ]
            );
        });
        break;
    }
}
