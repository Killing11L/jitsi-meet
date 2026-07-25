/*
 * Copyright (C) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { UITurboModule } from '@rnoh/react-native-openharmony';
import { DropboxSpaceUsage, DropboxConstants } from '../Type';

/**
 * 对应 android/sdk 的 DropboxModule (NativeModules.Dropbox)。
 *
 * android 版依赖 Dropbox Java SDK 做 OAuth + API 调用。鸿蒙侧无官方
 * Dropbox SDK,初版作桩实现:保留接口形状不破坏 JS 调用,authorize
 * 直接 reject 提示未配置。常量 ENABLED 恒为 false,JS 侧据此跳过 Dropbox
 * 录制路径(见 react/features/dropbox/functions.native.ts)。
 *
 * 后续若需启用,可用 WebView 走 OAuth PKCE 流,在回调里 resolve token。
 */
export class DropboxModule extends UITurboModule {
  public static readonly NAME = 'Dropbox';

  getConstants(): DropboxConstants {
    const constants: DropboxConstants = {
      ENABLED: false
    };
    return constants;
  }

  /** @ReactMethod authorize */
  public authorize(): Promise<void> {
    return Promise.reject(new Error('Dropbox integration is not configured on HarmonyOS.'));
  }

  /** @ReactMethod getDisplayName(token) */
  public getDisplayName(_token: string): Promise<string> {
    return Promise.reject(new Error('Dropbox integration is not configured on HarmonyOS.'));
  }

  /** @ReactMethod getSpaceUsage(token) */
  public getSpaceUsage(_token: string): Promise<DropboxSpaceUsage> {
    return Promise.reject(new Error('Dropbox integration is not configured on HarmonyOS.'));
  }
}
