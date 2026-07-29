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

/**
 * 对应 android/sdk 的 RNConnectionService (NativeModules.ConnectionService)。
 *
 * android 版用 Telecom ConnectionService 把会议注册为系统来电(通话集成,
 * 可在锁屏/通话界面接听)。鸿蒙侧无等价 Telecom,初版作桩实现:
 *   - 保留全部方法签名不破坏 JS 契约;
 *   - startCall 直接 resolve(true),reportConnectedOutgoingCall resolve;
 *   - 其余方法记录日志后空实现。
 * JS 侧 call-integration middleware 已有平台判断,鸿蒙走"未启用"分支即可。
 *
 * 事件:android 版通过 RCTDeviceEventEmitter 发通话状态事件,鸿蒙侧预留
 * emitDeviceEvent 通道,事件来源接线待后续。
 */
export class ConnectionServiceModule extends UITurboModule {
  public static readonly NAME = 'ConnectionService';

  /** @ReactMethod addListener (RN 内置事件发射器要求) */
  public addListener(_eventName: string): void {
    // no-op
  }

  /** @ReactMethod removeListeners (RN 内置事件发射器要求) */
  public removeListeners(_count: number): void {
    // no-op
  }

  /** @ReactMethod startCall(callUUID, handle, hasVideo) */
  public startCall(_callUUID: string, _handle: string, _hasVideo: boolean): Promise<boolean> {
    return Promise.resolve(true);
  }

  /** @ReactMethod reportCallFailed(callUUID) */
  public reportCallFailed(_callUUID: string): void {
    // no-op:鸿蒙无通话集成
  }

  /** @ReactMethod endCall(callUUID) */
  public endCall(_callUUID: string): void {
    // no-op:鸿蒙无通话集成
  }

  /** @ReactMethod reportConnectedOutgoingCall(callUUID) */
  public reportConnectedOutgoingCall(_callUUID: string): Promise<void> {
    return Promise.resolve();
  }

  /** @ReactMethod updateCall(callUUID, callState) */
  public updateCall(_callUUID: string, _callState: Record<string, Object>): void {
    // no-op:鸿蒙无通话集成
  }
}
