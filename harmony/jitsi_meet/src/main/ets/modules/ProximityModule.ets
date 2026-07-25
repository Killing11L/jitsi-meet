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

import { sensor } from '@kit.SensorServiceKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { power } from '@kit.BasicServicesKit';
import { UITurboModule } from '@rnoh/react-native-openharmony';
import { window } from '@kit.ArkUI';

/**
 * 对应 android/sdk 的 ProximityModule (NativeModules.Proximity)。
 *
 * android 版用 PowerManager PROXIMITY_SCREEN_OFF_WAKE_LOCK,通话音频模式下
 * 靠近耳朵时息屏。鸿蒙侧通话息屏由系统通话场景接管,此模块作精简实现:
 * 通过 @ohos.sensor 的 PROXIMITY 传感器记录启停状态,供后续按需扩展。
 * JS 侧仅调用 setEnabled(boolean)。
 */
export class ProximityModule extends UITurboModule {
  public static readonly NAME = 'Proximity';

  private enabled = false;

  /** @ReactMethod setEnabled */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      if (enabled) {
        try {
          sensor.on(sensor.SensorId.PROXIMITY, (data: sensor.ProximityResponse) => {
            if (data.distance === 0) {
              
            }

            if (data.distance === 5) {

            }
          }, { interval: 100000000 });
        } catch (error) {
          let e: BusinessError = error as BusinessError;
          console.error(`Failed to invoke on. Code: ${e.code}, message: ${e.message}`);
        }
      } else {
        sensor.off(sensor.SensorId.PROXIMITY)
      }
    } catch (e) {
      // 忽略传感器不可用的情况,不阻断调用。
    }
  }
}
