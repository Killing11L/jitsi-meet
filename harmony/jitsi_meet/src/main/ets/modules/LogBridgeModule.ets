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

import hilog from '@ohos.hilog';
import { UITurboModule } from '@rnoh/react-native-openharmony';

/**
 * 对应 android/sdk 的 LogBridgeModule (NativeModules.LogBridge)。
 *
 * 把 JS 侧的日志桥接到鸿蒙 hilog。JS 侧调用点:
 * react/features/base/logging/LogTransport.native.ts,6 个 level 方法。
 */
export class LogBridgeModule extends UITurboModule {
  public static readonly NAME = 'LogBridge';

  private static readonly DOMAIN = 0x0001;
  private static readonly TAG = 'JitsiMeet';

  /** @ReactMethod trace */
  public trace(message: string): void {
    hilog.debug(LogBridgeModule.DOMAIN, LogBridgeModule.TAG, `%{public}s`, message);
  }

  /** @ReactMethod debug */
  public debug(message: string): void {
    hilog.debug(LogBridgeModule.DOMAIN, LogBridgeModule.TAG, `%{public}s`, message);
  }

  /** @ReactMethod info */
  public info(message: string): void {
    hilog.info(LogBridgeModule.DOMAIN, LogBridgeModule.TAG, `%{public}s`, message);
  }

  /** @ReactMethod log (android 版等同 info) */
  public log(message: string): void {
    hilog.info(LogBridgeModule.DOMAIN, LogBridgeModule.TAG, `%{public}s`, message);
  }

  /** @ReactMethod warn */
  public warn(message: string): void {
    hilog.warn(LogBridgeModule.DOMAIN, LogBridgeModule.TAG, `%{public}s`, message);
  }

  /** @ReactMethod error */
  public error(message: string): void {
    hilog.error(LogBridgeModule.DOMAIN, LogBridgeModule.TAG, `%{public}s`, message);
  }
}
