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

import { PiPWindow } from '@kit.ArkUI';
import { UITurboModule } from '@rnoh/react-native-openharmony';
import { PiPBridge, PiPComponentSource, PictureInPictureConstants } from '../Type';

/**
 * 对应 android/sdk 的 PictureInPictureModule (NativeModules.PictureInPicture)。
 *
 * android 版用 Activity.enterPictureInPictureMode,以系统级方式进入小窗,
 * 不绑定特定视图。JS 侧调用点:
 *   react/features/conference/components/native/Conference.tsx(返回键)、
 *   react/features/mobile/picture-in-picture/*(工具栏 PiP 按钮)。
 *
 * 鸿蒙侧的 PiPWindow.create 强制要求一个 XComponent(componentController)
 * 作为小窗渲染源,与 android "无视图系统级 PiP" 模型不同。react-native-webrtc
 * 的 PiPManager 已完整实现了"绑定 RTCView 的 XComponent 启停 PiP",本模块因此
 * 不再自己造轮子,而是:
 *   - 通过 globalThis.rnohPiPBridge 复用 webrtc 的 PiPManager;
 *   - enterPictureInPicture 时取"主画面"(LargeVideo,面积最大的已注册视图)
 *     的 tag 并启动 PiP;
 *   - Jitsi JS 侧已在 LargeVideo 的 RTCView 上传 iosPIP,使其自动注册到 PiPManager。
 * 若桥接尚未就绪(极少数时序问题),保留 setPiPComponentSource 注入源的兜底路径。
 */
export class PictureInPictureModule extends UITurboModule {
  public static readonly NAME = 'PictureInPicture';

  /**
   * PiP 控制面板按钮点击事件名。JS 侧
   * react/features/mobile/picture-in-picture/pipControlMiddleware.ts 用同名字符串
   * 订阅 NativeEventEmitter(PictureInPicture)。两侧必须一致。
   */
  public static readonly PIP_CONTROL_EVENT = 'org.jitsi.meet:features/picture-in-picture#control';

  private isEnabled = false;
  private pipController?: PiPWindow.PiPController;
  private controlListenerRegistered = false;
  private controlListenerPending = false;

  /**
   * 宿主注入的 PiP 渲染源。鸿蒙 PiPWindow.create 需要:
   *   context             : common.UIAbilityContext
   *   componentController : XComponentController
   *   contentWidth/Height : 渲染分辨率
   */
  private static pipSource?: PiPComponentSource;

  /** 宿主 App 注入 PiP 渲染源(在挂载视频 XComponent 后调用)。 */
  public static setPiPComponentSource(source: PiPComponentSource): void {
    PictureInPictureModule.pipSource = source;
  }

  /**
   * 把 webrtc PiPManager 的按钮事件桥接到 JS。
   * 幂等:已注册则跳过。bridge 尚未就绪时置 pending 标志,
   * enterPictureInPicture 拿到 bridge 后补注册。
   */
  private tryRegisterControlListener(): void {
    if (this.controlListenerRegistered) {
      return;
    }
    const bridge = this.getBridge();
    if (!bridge) {
      this.controlListenerPending = true;
      return;
    }
    bridge.onControlEvent((event: string, status?: number) => {
      try {
        this.ctx.rnInstance.emitDeviceEvent(
          PictureInPictureModule.PIP_CONTROL_EVENT,
          { event, status: status ?? -1 }
        );
      } catch (e) {
        console.warn(`[PictureInPicture] emitDeviceEvent failed: ${(e as Error).message}`);
      }
    });
    this.controlListenerRegistered = true;
    this.controlListenerPending = false;
  }

  getConstants(): PictureInPictureConstants {
    const constants: PictureInPictureConstants = {
      SUPPORTED: this.isSupported()
    };
    return constants;
  }

  /** 读取 webrtc PiPManager 挂载到全局的桥接(可能尚未就绪)。 */
  private getBridge(): PiPBridge | undefined {
    return globalThis.rnohPiPBridge as PiPBridge | undefined;
  }

  /** 鸿蒙 PiP 需 API 12+ 且系统支持。优先复用桥接的能力判断。 */
  private isSupported(): boolean {
    const bridge = this.getBridge();
    if (bridge) {
      return bridge.isPiPSupported();
    }
    try {
      return PiPWindow.isPiPEnabled();
    } catch (e) {
      return false;
    }
  }

  /** @ReactMethod setPictureInPictureEnabled(enabled) */
  public setPictureInPictureEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * @ReactMethod registerPiPControlListener()
   *
   * 由 JS 侧 APP_WILL_MOUNT 时主动调用,确保 PiP 按钮事件被桥接到 JS。
   * 幂等。若 webrtc 的 globalThis.rnohPiPBridge 此时还未就绪(跨 HAR 加载顺序),
   * 标记 pending,在 enterPictureInPicture 时再次尝试补注册。
   */
  public registerPiPControlListener(): void {
    this.tryRegisterControlListener();
  }

  /**
   * @ReactMethod addListener (RN 内置事件发射器要求)
   *
   * 本模块通过 this.ctx.rnInstance.emitDeviceEvent 向 JS 发射 PiP 控件事件
   * (PIP_CONTROL_EVENT), JS 侧用 NativeEventEmitter(PictureInPicture) 订阅。
   * RN 规范要求发射事件的 NativeModule 必须实现 addListener/removeListeners,
   * 否则触发 "Module PictureInPicture requires addListener method" 警告,
   * 某些 RNOH 版本下会导致订阅静默失效。这里与同仓 AudioMode/ExternalAPI/
   * ConnectionService 三个模块保持一致的 no-op 实现。
   */
  public addListener(_eventName: string): void {
    // no-op: 事件由 emitDeviceEvent 发射, 无需在此管理监听器。
  }

  /** @ReactMethod removeListeners (RN 内置事件发射器要求) */
  public removeListeners(_count: number): void {
    // no-op
  }

  /**
   * @ReactMethod enterPictureInPicture()
   *
   * 采用"尽力而为(best-effort)"语义,永不 reject:
   *   - 未启用 / 不支持 / 无可用视频源 / 启动失败 → 仅打日志后 resolve;
   *   - 原因:Jitsi JS(actions.ts)里 `p.finally(...)` 与 `p.catch(...)` 是两条
   *     独立链,一旦本方法 reject,finally 那条链会变成"未捕获的 Promise",
   *     在 RN 上报 "Uncaught (in promise)"。而"当前没有视频可缩放"本就不是异常。
   */
  public async enterPictureInPicture(): Promise<void> {
    // 若 JS 侧 APP_WILL_MOUNT 时 bridge 还没就绪,这里兜底补注册。
    if (this.controlListenerPending || !this.controlListenerRegistered) {
      this.tryRegisterControlListener();
    }

    if (!this.isEnabled) {
      // 与 android 行为一致:未启用时直接返回。
      return;
    }
    if (!this.isSupported()) {
      console.warn('[PictureInPicture] not supported on this device, skip.');
      return;
    }

    // 首选路径:复用 webrtc PiPManager(LargeVideo 已通过 iosPIP 自动注册)。
    const bridge = this.getBridge();
    if (bridge) {
      const tag: number = bridge.getPrimaryPiPTag();
      if (tag >= 0) {
        try {
          const ok: boolean = await bridge.startPiPByTag(tag);
          if (!ok) {
            console.warn(`[PictureInPicture] startPiP returned false, tag=${tag}.`);
          }
        } catch (e) {
          console.warn(`[PictureInPicture] startPiP threw: ${(e as Error).message}`);
        }
        return;
      }
      // 桥接就绪但没有已注册的视频视图:多为"摄像头关闭且无远端参会者",
      // 大画面无 stream → 未渲染 RTCView → 无可 PiP 的源。属正常情况,直接返回。
      console.warn('[PictureInPicture] no registered video view (LargeVideo has no stream?), skip.');
      return;
    }

    // 兜底路径:宿主通过 setPiPComponentSource 注入 XComponent 源。
    const source = PictureInPictureModule.pipSource;
    if (!source) {
      console.warn(
        '[PictureInPicture] no video source. Ensure LargeVideo (RTCView) is mounted with ' +
        'iosPIP (rebuild the JS bundle), or call setPiPComponentSource(...).'
      );
      return;
    }

    try {
      const config: PiPWindow.PiPConfiguration = {
        context: source.context,
        componentController: source.componentController,
        templateType: PiPWindow.PiPTemplateType.VIDEO_MEETING,
        contentWidth: source.contentWidth || 720,
        contentHeight: source.contentHeight || 1280,
      };
      this.pipController = await PiPWindow.create(config);
      await this.pipController.startPiP();
    } catch (e) {
      console.warn('[PictureInPicture] failed to enter PiP via source: ' + (e as Error).message);
    }
  }
}
