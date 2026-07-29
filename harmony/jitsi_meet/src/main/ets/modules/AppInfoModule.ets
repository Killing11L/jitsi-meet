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

import bundleManager from '@ohos.bundle.bundleManager';
import { UITurboModule } from '@rnoh/react-native-openharmony';
import { AppInfoConstants } from '../Type';

/**
 * 对应 android/sdk 的 AppInfoModule (NativeModules.AppInfo)。
 *
 * 仅暴露常量给 JS,无 @ReactMethod。JS 侧用到:
 *   - name               (react/features/app/functions.native.ts)
 *   - sdkBundlePath      (react/features/app/functions.native.ts)
 *   - LIBRE_BUILD        (react/features/base/config/functions.native.ts)
 *   - calendarEnabled    (react/features/calendar-sync/functions.native.ts)
 * android 版额外有 buildNumber/version/sdkVersion/GOOGLE_SERVICES_ENABLED,
 * 一并保留以维持与 android 常量集对齐。
 */
export class AppInfoModule extends UITurboModule {
  public static readonly NAME = 'AppInfo';

  /** 构建期常量。鸿蒙无 BuildConfig 等价物,默认值可按需调整。 */
  private static readonly LIBRE_BUILD = false;
  private static readonly GOOGLE_SERVICES_ENABLED = false;
  private static readonly SDK_VERSION = '';
  private static readonly CALENDAR_ENABLED = false;

  getConstants(): AppInfoConstants {
    let name = '';
    let version = '';
    let buildNumber = '';

    try {
      const info = bundleManager.getBundleInfoForSelfSync(
        bundleManager.BundleFlag.GET_BUNDLE_INFO_DEFAULT
      );
      name = info.name;
      version = info.versionName;
      buildNumber = String(info.versionCode);
    } catch (e) {
      // 取不到则保持空串,不阻断模块初始化
    }

    const constants: AppInfoConstants = {
      buildNumber,
      name,
      version,
      sdkVersion: AppInfoModule.SDK_VERSION,
      // JS 侧 functions.native.ts 读取,鸿蒙无等价物,返回应用沙箱目录
      sdkBundlePath: '',
      LIBRE_BUILD: AppInfoModule.LIBRE_BUILD,
      GOOGLE_SERVICES_ENABLED: AppInfoModule.GOOGLE_SERVICES_ENABLED,
      // JS 侧 calendar-sync 读取,鸿蒙暂无日历集成
      calendarEnabled: AppInfoModule.CALENDAR_ENABLED
    };
    return constants;
  }
}
