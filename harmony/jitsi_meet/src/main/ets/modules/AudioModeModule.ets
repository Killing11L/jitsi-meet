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

import { audio } from '@kit.AudioKit';
import { BusinessError } from '@kit.BasicServicesKit';
import hilog from '@ohos.hilog';
import { UITurboModule, UITurboModuleContext } from '@rnoh/react-native-openharmony';
import {
  AUDIO_MODE_DEFAULT, AUDIO_MODE_AUDIO_CALL, AUDIO_MODE_VIDEO_CALL,
  DEVICE_BLUETOOTH, DEVICE_EARPIECE, DEVICE_HEADPHONES, DEVICE_SPEAKER,
  AudioModeConstants, AudioDeviceItem
} from '../Type';

/**
 * 对应 android/sdk 的 AudioModeModule (NativeModules.AudioMode)。
 *
 * 鸿蒙 SDK 说明(以 @ohos.multimedia.audio.d.ts 为准):
 * - CommunicationDeviceType 在本 SDK 仅含 SPEAKER;听筒需 setCommunicationDevice(SPEAKER, false)。
 * - 通话场景切换优先用 AudioSessionManager.setDefaultOutputDevice(DeviceType.*), API 20+。
 */
export class AudioModeModule extends UITurboModule {
  public static readonly NAME = 'AudioMode';

  private static readonly DOMAIN = 0x0001;
  private static readonly TAG = 'JitsiMeet.AudioMode';

  private static readonly DEVICE_CHANGE_EVENT = 'org.jitsi.meet:features/audio-mode#devices-update';

  private mode = -1;
  private audioDisabled = false;
  private useConnectionServiceFlag = true;
  private userSelectedDevice: string | null = null;
  private availableDevices: Set<string> = new Set();
  private selectedDevice = '';

  private audioManager?: audio.AudioManager;
  private routingManager?: audio.AudioRoutingManager;
  private audioSessionManager?: audio.AudioSessionManager;
  private deviceChangeRegistered = false;

  constructor(ctx: UITurboModuleContext) {
    super(ctx);
    try {
      this.audioManager = audio.getAudioManager();
      this.routingManager = this.audioManager.getRoutingManager();
      this.audioSessionManager = this.audioManager.getSessionManager();
      this.registerDeviceChange();
      this.refreshDevices();
    } catch (e) {
      hilog.error(AudioModeModule.DOMAIN, AudioModeModule.TAG,
        `init failed: ${(e as Error).message}`);
    }
  }

  getConstants(): AudioModeConstants {
    return {
      DEVICE_CHANGE_EVENT: AudioModeModule.DEVICE_CHANGE_EVENT,
      AUDIO_CALL: AUDIO_MODE_AUDIO_CALL,
      DEFAULT: AUDIO_MODE_DEFAULT,
      VIDEO_CALL: AUDIO_MODE_VIDEO_CALL
    };
  }

  public addListener(_eventName: string): void {
  }

  public removeListeners(_count: number): void {
  }

  public setAudioDevice(device: string): void {
    if (!this.availableDevices.has(device)) {
      hilog.warn(AudioModeModule.DOMAIN, AudioModeModule.TAG,
        `Audio device not available: ${device}`);
      this.userSelectedDevice = null;
      return;
    }
    if (this.mode !== -1) {
      this.userSelectedDevice = device;
      this.updateAudioRoute();
    }
  }

  public setDisabled(disabled: boolean): Promise<void> {
    if (this.audioDisabled === disabled) {
      return Promise.resolve();
    }
    this.audioDisabled = disabled;
    if (disabled) {
      this.mode = -1;
      this.availableDevices.clear();
      this.selectedDevice = '';
      this.userSelectedDevice = null;
    } else {
      this.refreshDevices();
    }
    return Promise.resolve();
  }

  public setMode(mode: number): Promise<void> {
    if (this.audioDisabled) {
      return Promise.resolve();
    }
    if (mode < AUDIO_MODE_DEFAULT || mode > AUDIO_MODE_VIDEO_CALL) {
      return Promise.reject(new Error(`Invalid audio mode ${mode}`));
    }
    try {
      this.mode = mode;
      if (mode === AUDIO_MODE_DEFAULT) {
        this.userSelectedDevice = null;
        this.audioSessionManager?.setAudioSessionScene(
          audio.AudioSessionScene.AUDIO_SESSION_SCENE_MEDIA
        );
      } else {
        this.audioSessionManager?.setAudioSessionScene(
          audio.AudioSessionScene.AUDIO_SESSION_SCENE_VOICE_COMMUNICATION
        );
      }
      this.updateAudioRoute();
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(new Error(`Failed to update audio route for mode: ${mode}: ${(e as Error).message}`));
    }
  }

  public setUseConnectionService(use: boolean): void {
    this.useConnectionServiceFlag = use;
  }

  public updateDeviceList(): void {
    this.refreshDevices();
  }

  private registerDeviceChange(): void {
    if (this.deviceChangeRegistered || !this.routingManager) {
      return;
    }
    try {
      this.routingManager.on('deviceChange', audio.DeviceFlag.ALL_DEVICES_FLAG, () => {
        this.refreshDevices();
      });
      this.deviceChangeRegistered = true;
    } catch (e) {
      hilog.error(AudioModeModule.DOMAIN, AudioModeModule.TAG,
        `register deviceChange failed: ${(e as Error).message}`);
    }
  }

  private async refreshDevices(): Promise<void> {
    try {
      this.availableDevices = new Set();
      this.availableDevices.add(DEVICE_SPEAKER);
      this.availableDevices.add(DEVICE_EARPIECE);
      try {
        const devices = await this.routingManager?.getDevices(audio.DeviceFlag.ALL_DEVICES_FLAG) ?? [];
        for (const d of devices) {
          const mapped = this.mapDeviceType(d);
          if (mapped) {
            this.availableDevices.add(mapped);
          }
        }
      } catch (e) {
      }

      if (this.userSelectedDevice !== null && this.availableDevices.has(this.userSelectedDevice)) {
        this.selectedDevice = this.userSelectedDevice;
      } else {
        if (this.userSelectedDevice !== null && !this.availableDevices.has(this.userSelectedDevice)) {
          this.userSelectedDevice = null;
        }
        this.selectedDevice = this.computeDefaultDevice();
      }
      this.notifyDevicesChanged();
    } catch (e) {
      hilog.error(AudioModeModule.DOMAIN, AudioModeModule.TAG,
        `refreshDevices failed: ${(e as Error).message}`);
    }
  }

  private mapDeviceType(d: audio.AudioDeviceDescriptor): string | null {
    if (d.deviceType === audio.DeviceType.SPEAKER) return DEVICE_SPEAKER;
    if (d.deviceType === audio.DeviceType.WIRED_HEADSET) return DEVICE_HEADPHONES;
    if (d.deviceType === audio.DeviceType.WIRED_HEADPHONES) return DEVICE_HEADPHONES;
    if (d.deviceType === audio.DeviceType.EARPIECE) return DEVICE_EARPIECE;
    if (d.deviceType === audio.DeviceType.BLUETOOTH_SCO) return DEVICE_BLUETOOTH;
    if (d.deviceType === audio.DeviceType.BLUETOOTH_A2DP) return DEVICE_BLUETOOTH;
    return null;
  }

  private computeDefaultDevice(): string {
    if (this.availableDevices.has(DEVICE_BLUETOOTH)) {
      return DEVICE_BLUETOOTH;
    }
    if (this.availableDevices.has(DEVICE_HEADPHONES)) {
      return DEVICE_HEADPHONES;
    }
    if (this.mode === AUDIO_MODE_AUDIO_CALL && this.availableDevices.has(DEVICE_EARPIECE)) {
      return DEVICE_EARPIECE;
    }
    return DEVICE_SPEAKER;
  }

  /** jitsi 设备 → audio.DeviceType (用于 setDefaultOutputDevice,API 20+)。 */
  private mapJitsiDeviceToDeviceType(device: string): audio.DeviceType | null {
    switch (device) {
      case DEVICE_SPEAKER:
        return audio.DeviceType.SPEAKER;
      case DEVICE_EARPIECE:
        return audio.DeviceType.EARPIECE;
      case DEVICE_BLUETOOTH:
        return audio.DeviceType.BLUETOOTH_SCO;
      case DEVICE_HEADPHONES:
        return audio.DeviceType.WIRED_HEADPHONES;
      default:
        return null;
    }
  }

  /** 激活通话 AudioSession(API 12 activate + API 20 scene)。 */
  private async ensureVoiceCommunicationSession(): Promise<void> {
    if (!this.audioSessionManager) {
      return;
    }
    try {
      this.audioSessionManager.setAudioSessionScene(
        audio.AudioSessionScene.AUDIO_SESSION_SCENE_VOICE_COMMUNICATION
      );
    } catch (e) {
      hilog.warn(AudioModeModule.DOMAIN, AudioModeModule.TAG,
        `setAudioSessionScene failed: ${(e as Error).message}`);
    }
    if (this.audioSessionManager.isAudioSessionActivated()) {
      return;
    }
    const strategy: audio.AudioSessionStrategy = {
      concurrencyMode: audio.AudioConcurrencyMode.CONCURRENCY_MIX_WITH_OTHERS
    };
    await this.audioSessionManager.activateAudioSession(strategy);
  }

  /**
   * 本 SDK CommunicationDeviceType 仅有 SPEAKER:
   * - 扬声器: setCommunicationDevice(SPEAKER, true)
   * - 听筒:   setCommunicationDevice(SPEAKER, false)
   */
  private applyCommunicationDeviceFallback(target: string): Promise<void> {
    if (!this.routingManager) {
      return Promise.reject(new Error('AudioRoutingManager unavailable'));
    }
    if (target !== DEVICE_SPEAKER && target !== DEVICE_EARPIECE) {
      hilog.warn(AudioModeModule.DOMAIN, AudioModeModule.TAG,
        `${target} not routable via CommunicationDeviceType, system may auto-route`);
      return Promise.resolve();
    }
    const active = target === DEVICE_SPEAKER;
    return new Promise((resolve, reject) => {
      this.routingManager!.setCommunicationDevice(
        audio.CommunicationDeviceType.SPEAKER,
        active,
        (err: BusinessError) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /** 优先 AudioSessionManager.setDefaultOutputDevice,失败则回退 CommunicationDeviceType。 */
  private async applyAudioRoute(target: string): Promise<void> {
    const deviceType = this.mapJitsiDeviceToDeviceType(target);
    if (deviceType === null) {
      throw new Error(`Unknown audio device: ${target}`);
    }

    if (this.audioSessionManager && typeof this.audioSessionManager.setDefaultOutputDevice === 'function') {
      try {
        await this.ensureVoiceCommunicationSession();
        await this.audioSessionManager.setDefaultOutputDevice(deviceType);
        return;
      } catch (e) {
        hilog.warn(AudioModeModule.DOMAIN, AudioModeModule.TAG,
          `setDefaultOutputDevice(${target}) failed, fallback: ${(e as BusinessError).code ?? ''} ${(e as Error).message}`);
      }
    }

    await this.applyCommunicationDeviceFallback(target);
  }

  private updateAudioRoute(): void {
    if (this.mode === AUDIO_MODE_DEFAULT) {
      this.selectedDevice = '';
      this.userSelectedDevice = null;
      this.notifyDevicesChanged();
      return;
    }

    const target = this.userSelectedDevice ?? this.computeDefaultDevice();
    this.selectedDevice = target;

    this.applyAudioRoute(target)
      .then(() => {
        hilog.info(AudioModeModule.DOMAIN, AudioModeModule.TAG, `Audio route set to ${target}`);
      })
      .catch((err: BusinessError | Error) => {
        hilog.error(AudioModeModule.DOMAIN, AudioModeModule.TAG,
          `applyAudioRoute(${target}) failed: ${(err as BusinessError).code ?? ''} ${err.message}`);
      })
      .finally(() => {
        this.notifyDevicesChanged();
      });
  }

  private notifyDevicesChanged(): void {
    const data: AudioDeviceItem[] = [];
    const hasHeadphones = this.availableDevices.has(DEVICE_HEADPHONES);
    for (const device of this.availableDevices) {
      if (hasHeadphones && device === DEVICE_EARPIECE) {
        continue;
      }
      data.push({
        type: device,
        selected: device === this.selectedDevice
      });
    }
    this.ctx.rnInstance.emitDeviceEvent(AudioModeModule.DEVICE_CHANGE_EVENT, data);
  }
}
