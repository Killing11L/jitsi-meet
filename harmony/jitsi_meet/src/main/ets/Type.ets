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

/**
 * jitsi-meet 鸿蒙化模块共享类型定义。
 * 对应 android/sdk 各 NativeModule 之间的数据契约。
 */

/** AudioModeModule 设备变更事件载荷 */
export interface AudioDevicesUpdateEvent {
  /** 当前可用的音频设备列表,如 ["SPEAKER","EARPIECE"] */
  availableDevices: string[];
  /** 当前选中的音频设备 */
  selectedDevice: string;
}

/** AudioMode 模式常量 */
export const AUDIO_MODE_DEFAULT = 0;
export const AUDIO_MODE_AUDIO_CALL = 1;
export const AUDIO_MODE_VIDEO_CALL = 2;

/** 音频设备类型字符串常量(对齐 android AudioModeModule) */
export const DEVICE_BLUETOOTH = 'BLUETOOTH';
export const DEVICE_EARPIECE = 'EARPIECE';
export const DEVICE_HEADPHONES = 'HEADPHONES';
export const DEVICE_SPEAKER = 'SPEAKER';

/**
 * ExternalAPI 事件名 / BroadcastAction 常量(对齐 android BroadcastAction.Type)。
 *
 * ArkTS 不允许无类型对象字面量,也不允许把对象字面量赋给 Record<string,string>。
 * 故用 class + static readonly 成员表达常量集合,getConstants() 逐字段读取。
 */
export class ExternalApiActions {
  static readonly SET_AUDIO_MUTED: string = 'set-audio-muted';
  static readonly HANG_UP: string = 'hang-up';
  static readonly SEND_ENDPOINT_TEXT_MESSAGE: string = 'send-endpoint-text-message';
  static readonly TOGGLE_SCREEN_SHARE: string = 'toggle-screen-share';
  static readonly RETRIEVE_PARTICIPANTS_INFO: string = 'retrieve-participants-info';
  static readonly OPEN_CHAT: string = 'open-chat';
  static readonly CLOSE_CHAT: string = 'close-chat';
  static readonly SEND_CHAT_MESSAGE: string = 'send-chat-message';
  static readonly SET_VIDEO_MUTED: string = 'set-video-muted';
  static readonly SET_CLOSED_CAPTIONS_ENABLED: string = 'set-closed-captions-enabled';
  static readonly TOGGLE_CAMERA: string = 'toggle-camera';
  static readonly SHOW_NOTIFICATION: string = 'show-notification';
  static readonly HIDE_NOTIFICATION: string = 'hide-notification';
  static readonly START_RECORDING: string = 'start-recording';
  static readonly STOP_RECORDING: string = 'stop-recording';
  static readonly OVERWRITE_CONFIG: string = 'overwrite-config';
  static readonly SEND_CAMERA_FACING_MODE_MESSAGE: string = 'send-camera-facing-mode-message';
}

/** ExternalAPI.getConstants() 返回类型 */
export interface ExternalApiConstants {
  SET_AUDIO_MUTED: string;
  HANG_UP: string;
  SEND_ENDPOINT_TEXT_MESSAGE: string;
  TOGGLE_SCREEN_SHARE: string;
  RETRIEVE_PARTICIPANTS_INFO: string;
  OPEN_CHAT: string;
  CLOSE_CHAT: string;
  SEND_CHAT_MESSAGE: string;
  SET_VIDEO_MUTED: string;
  SET_CLOSED_CAPTIONS_ENABLED: string;
  TOGGLE_CAMERA: string;
  SHOW_NOTIFICATION: string;
  HIDE_NOTIFICATION: string;
  START_RECORDING: string;
  STOP_RECORDING: string;
  OVERWRITE_CONFIG: string;
  SEND_CAMERA_FACING_MODE_MESSAGE: string;
}

/** AppInfo.getConstants() 返回类型 */
export interface AppInfoConstants {
  buildNumber: string;
  name: string;
  version: string;
  sdkVersion: string;
  sdkBundlePath: string;
  LIBRE_BUILD: boolean;
  GOOGLE_SERVICES_ENABLED: boolean;
  calendarEnabled: boolean;
}

/** AudioMode.getConstants() 返回类型 */
export interface AudioModeConstants {
  DEVICE_CHANGE_EVENT: string;
  AUDIO_CALL: number;
  DEFAULT: number;
  VIDEO_CALL: number;
}

/** PictureInPicture.getConstants() 返回类型 */
export interface PictureInPictureConstants {
  SUPPORTED: boolean;
}

/** Dropbox.getConstants() 返回类型 */
export interface DropboxConstants {
  ENABLED: boolean;
}

/** LocaleDetector.getConstants() 返回类型 */
export interface LocaleDetectorConstants {
  locale: string;
}

/**
 * JMOngoingConference(会议进行中常驻通知)模块的 JS 事件名与契约。
 *
 * 鸿蒙侧 JitsiOngoingConferenceModule 在收到通知按钮(挂断/静音)触发的公共事件后,
 * 通过 emitDeviceEvent(ACTION_EVENT, {action, muted}) 下发给 JS。
 * JS 中间件(react/features/mobile/ongoing-conference/middleware.js)用同名字符串订阅。
 */
export class OngoingConferenceConstants {
  /** 按钮动作事件名(通知按钮点击 → 鸿蒙模块 → JS)。 */
  static readonly ACTION_EVENT: string = 'org.jitsi.meet:features/ongoing-conference#action';
}

/** OngoingConference 按钮动作事件载荷。 */
export interface OngoingConferenceActionEvent {
  /** 'hangUp' | 'setAudioMuted'。 */
  action: string;
  /** setAudioMuted 时为目标静音状态;hangUp 时忽略。 */
  muted: boolean;
}

/** AudioMode 设备变更事件单项 */
export interface AudioDeviceItem {
  type: string;
  selected: boolean;
}

/** Dropbox 空间用量结果(对齐 android DropboxModule.getSpaceUsage) */
export interface DropboxSpaceUsage {
  used: string;
  allocated: string;
}

/** Dropbox 授权结果 */
export interface DropboxAuthResult {
  token: string;
  rToken: string;
  expireDate: number;
}

/** PictureInPicture 宿主注入的 PiP 渲染源 */
export interface PiPComponentSource {
  context: Context;
  componentController: XComponentController;
  contentWidth: number;
  contentHeight: number;
}

/**
 * 跨 HAR PiP 桥接契约(由 react-native-webrtc 的 PiPManager 挂到
 * globalThis.rnohPiPBridge)。jitsi 侧 PictureInPictureModule 通过它复用
 * webrtc 已实现的 PiP 能力,避免重复造轮子/跨 HAR 单例问题。
 */
export interface PiPBridge {
  getPrimaryPiPTag(): number;
  startPiPByTag(tag: number): Promise<boolean>;
  stopPiPByTag(tag: number): Promise<boolean>;
  isPiPSupported(): boolean;

  /**
   * 订阅 PiP 控制面板按钮点击事件(挂断/麦克风/摄像头/静音)。
   * 多次调用以最后一次为准(覆盖式注册)。
   *
   * @param cb 回调,参数与 PiP controlPanelActionEvent 一致:
   *           event 为业务事件字符串('hangUp'/'micStateChanged'/
   *           'videoStateChanged'/'voiceStateChanged'),
   *           status 为控件状态(1=OPEN, 0=CLOSE, -1=默认如挂断)。
   */
  onControlEvent(cb: (event: string, status?: number) => void): void;
}
