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
import { ExternalApiActions, ExternalApiConstants } from '../Type';

/**
 * 对应 android/sdk 的 ExternalAPIModule (NativeModules.ExternalAPI)。
 *
 * android 版通过 BroadcastEmitter 把 SDK 内部事件转发给原生嵌入者
 * (用 BroadcastReceiver 双向通信)。鸿蒙侧用 RNOH 的 emitDeviceEvent
 * 向 JS 侧发射事件,常量集与 android BroadcastAction.Type 对齐。
 *
 * sendEvent(name, data) 供 JS 把"会议事件"下发给原生侧;鸿蒙侧预留
 * onExternalAPIEvent 钩子,由宿主 App(如 ExternalAPIAbility)对接,
 * 初版仅做日志 + 转发到 emitDeviceEvent 通道。
 */
export class ExternalAPIModule extends UITurboModule {
  public static readonly NAME = 'ExternalAPI';

  /** 可被宿主注入的事件回调(原生侧订阅会议事件)。 */
  private static externalAPIEventListener?: (name: string, data: Record<string, Object>) => void;

  /** 宿主 App 注册会议事件监听。 */
  public static setExternalAPIEventListener(
    listener: (name: string, data: Record<string, Object>) => void
  ): void {
    ExternalAPIModule.externalAPIEventListener = listener;
  }

  /** @ReactMethod addListener (RN 内置事件发射器要求) */
  public addListener(_eventName: string): void {
    // no-op
  }

  /** @ReactMethod removeListeners (RN 内置事件发射器要求) */
  public removeListeners(_count: number): void {
    // no-op
  }

  getConstants(): ExternalApiConstants {
    // android BroadcastAction.Type.getAction() 的字符串值,供 JS 侧枚举。
    // ArkTS 不允许对象字面量 spread,故逐字段构造。
    const constants: ExternalApiConstants = {
      SET_AUDIO_MUTED: ExternalApiActions.SET_AUDIO_MUTED,
      HANG_UP: ExternalApiActions.HANG_UP,
      SEND_ENDPOINT_TEXT_MESSAGE: ExternalApiActions.SEND_ENDPOINT_TEXT_MESSAGE,
      TOGGLE_SCREEN_SHARE: ExternalApiActions.TOGGLE_SCREEN_SHARE,
      RETRIEVE_PARTICIPANTS_INFO: ExternalApiActions.RETRIEVE_PARTICIPANTS_INFO,
      OPEN_CHAT: ExternalApiActions.OPEN_CHAT,
      CLOSE_CHAT: ExternalApiActions.CLOSE_CHAT,
      SEND_CHAT_MESSAGE: ExternalApiActions.SEND_CHAT_MESSAGE,
      SET_VIDEO_MUTED: ExternalApiActions.SET_VIDEO_MUTED,
      SET_CLOSED_CAPTIONS_ENABLED: ExternalApiActions.SET_CLOSED_CAPTIONS_ENABLED,
      TOGGLE_CAMERA: ExternalApiActions.TOGGLE_CAMERA,
      SHOW_NOTIFICATION: ExternalApiActions.SHOW_NOTIFICATION,
      HIDE_NOTIFICATION: ExternalApiActions.HIDE_NOTIFICATION,
      START_RECORDING: ExternalApiActions.START_RECORDING,
      STOP_RECORDING: ExternalApiActions.STOP_RECORDING,
      OVERWRITE_CONFIG: ExternalApiActions.OVERWRITE_CONFIG,
      SEND_CAMERA_FACING_MODE_MESSAGE: ExternalApiActions.SEND_CAMERA_FACING_MODE_MESSAGE
    };
    return constants;
  }

  /** @ReactMethod sendEvent(name, data) */
  public sendEvent(name: string, data: Record<string, Object>): void {
    try {
      // 转发给宿主(若有监听),由宿主决定如何广播/分发。
      ExternalAPIModule.externalAPIEventListener?.(name, data ?? {});
    } catch (e) {
      // 忽略,不阻断 JS 调用。
    }
  }

  /**
   * 原生侧向 JS 发射外部 API 事件。
   * 宿主 App 通过此方法把原生事件(如按钮点击)注入 RN。
   */
  public emitToJS(name: string, data: Record<string, Object>): void {
    this.ctx.rnInstance.emitDeviceEvent(name, data ?? {});
  }
}
