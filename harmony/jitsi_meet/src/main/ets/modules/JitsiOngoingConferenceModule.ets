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

import { notificationManager } from '@kit.NotificationKit';
import { wantAgent, WantAgent } from '@kit.AbilityKit';
import { commonEventManager } from '@kit.BasicServicesKit';
import { BusinessError } from '@kit.BasicServicesKit';
import bundleManager from '@ohos.bundle.bundleManager';
import hilog from '@ohos.hilog';
import { UITurboModule } from '@rnoh/react-native-openharmony';
import { OngoingConferenceConstants, OngoingConferenceActionEvent } from '../Type';

/**
 * 对应 android/sdk 的 JitsiMeetOngoingConferenceService + OngoingNotification
 * (JS 侧 NativeModules.JMOngoingConference)。
 *
 * android 版用前台 Service + 通话类常驻通知(挂断/静音按钮 + 计时)实现。
 * 鸿蒙侧:
 *  - 不用 Call Service Kit(它是 VoIP 来电模型,需 Push Kit + 产生系统通话 UI/通话记录,
 *    与"会议中通知栏控制块"错配)。
 *  - 用 @kit.NotificationKit 的普通通知 + actionButtons(最多2个,挂断/静音) +
 *    wantAgent(SEND_COMMON_EVENT)。
 *  - 不承载保活(安卓 startForeground 顺带保活;鸿蒙保活由宿主后台长时任务独立解决)。
 *
 * 事件链路:
 *   用户点通知按钮 → 系统发对应公共事件 → 本模块 commonEventManager 订阅器收到
 *   → emitDeviceEvent(ACTION_EVENT, {action, muted}) → JS 中间件派发 hangup/setAudioMuted。
 *
 * JS 侧 react/features/mobile/react-native-sdk/middleware.js 在 conference 状态变化时
 * 调 launch()/abort(),与 android JMOngoingConference 调用契约一致。
 */
export class JitsiOngoingConferenceModule extends UITurboModule {
  public static readonly NAME = 'JMOngoingConference';

  private static readonly DOMAIN = 0x0001;
  private static readonly TAG = 'JitsiMeet.OngoingConference';

  /** 常驻通知固定 ID(同 ID 覆盖更新,取消时用)。 */
  private static readonly NOTIFICATION_ID = 0x4A4D4F43; // 'JMOC'

  /**
   * 通知按钮点击公共事件名。按钮的 wantAgent(actionType=SEND_COMMON_EVENT)
   * 发这些事件,本模块订阅后转为 ACTION_EVENT 下发给 JS。
   */
  private static readonly EVT_HANG_UP = 'org.jitsi.meet.ongoing.HANG_UP';
  private static readonly EVT_SET_AUDIO_MUTED = 'org.jitsi.meet.ongoing.SET_AUDIO_MUTED';

  /** 宿主注入的"点通知主体返回会议"目标 Ability(可选)。 */
  private static launchBundleName: string = '';
  private static launchAbilityName: string = '';

  /** 当前是否已展示通知(避免重复 publish / 重复订阅)。 */
  private isActive = false;
  /** 当前静音状态(决定静音按钮文字 Mute/Unmute)。 */
  private isAudioMuted = false;

  /** 公共事件订阅者(abort 时 unsubscribe)。 */
  private subscriber?: commonEventManager.CommonEventSubscriber;
  /** 是否正在订阅(避免 launch 重复订阅 / abort 重复解订阅)。 */
  private isSubscribing = false;

  /** 宿主 App 注入"点通知主体"拉起的 Ability(默认取本应用 bundleName + EntryAbility)。 */
  public static setLaunchAbility(bundleName: string, abilityName: string): void {
    JitsiOngoingConferenceModule.launchBundleName = bundleName;
    JitsiOngoingConferenceModule.launchAbilityName = abilityName;
  }

  /** @ReactMethod addListener (RN 内置事件发射器要求) */
  public addListener(_eventName: string): void {
    // no-op: 事件由 emitDeviceEvent 发射。
  }

  /** @ReactMethod removeListeners (RN 内置事件发射器要求) */
  public removeListeners(_count: number): void {
    // no-op
  }

  /**
   * @ReactMethod launch(extraData?)
   * 展示"会议进行中"常驻通知 + 订阅按钮公共事件。
   * extraData 预留(android 传 isAudioMuted 等),初版从 this.isAudioMuted 取。
   *
   * 通知授权:鸿蒙三方应用发通知需用户授权(应用通知开关)。授权由宿主
   * EntryAbility 启动时调 notificationManager.requestEnableNotification 弹框请求。
   * 本方法发通知前用 isNotificationEnabled 预检:未启用则不 publish(避免 1600004 报错),
   * 仅记录日志;按钮事件订阅仍正常建立(授权后下次 launch 即可显示)。
   */
  public async launch(_extraData?: Record<string, Object>): Promise<void> {
    if (this.isActive) {
      // 已展示:仅刷新一次(用最新静音状态)。
      await this.publishNotification();
      return;
    }
    try {
      // 通知授权预检:未启用则不发(避免 Notification disabled 报错)。
      const enabled = await this.isNotificationEnabled();
      if (!enabled) {
        hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
          'launch: notification not enabled (user denied or not requested yet), skip publishing. ' +
          'Enable notifications in system settings or call requestEnableNotification in host EntryAbility.');
        // 仍订阅按钮事件,以便授权后下次 launch 直接可用。
        await this.ensureSubscribed();
        this.isActive = false;
        return;
      }
      await this.ensureSubscribed();
      await this.publishNotification();
      this.isActive = true;
      hilog.info(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG, 'launch: ongoing notification shown');
    } catch (e) {
      hilog.error(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `launch failed: ${(e as Error).message}`);
    }
  }

  /** 查询应用通知是否已授权启用。 */
  private async isNotificationEnabled(): Promise<boolean> {
    try {
      return await notificationManager.isNotificationEnabled();
    } catch (e) {
      hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `isNotificationEnabled failed: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * @ReactMethod abort()
   * 取消通知 + 解订阅公共事件。
   */
  public async abort(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    try {
      await notificationManager.cancel(JitsiOngoingConferenceModule.NOTIFICATION_ID);
    } catch (e) {
      hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `abort cancel notification failed: ${(e as Error).message}`);
    }
    await this.unsubscribe();
    this.isActive = false;
    hilog.info(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG, 'abort: ongoing notification cancelled');
  }

  /**
   * @ReactMethod updateAudioMutedState(isMuted)
   * JS 在麦克风静音状态变化时调用,重新 publish(同 ID 覆盖)刷新按钮文字。
   * 对齐 android 收到 AUDIO_MUTED_CHANGED 后 notify 刷新通知的行为。
   */
  public async updateAudioMutedState(isMuted: boolean): Promise<void> {
    if (!this.isActive) {
      this.isAudioMuted = isMuted;
      return;
    }
    if (this.isAudioMuted === isMuted) {
      return;
    }
    this.isAudioMuted = isMuted;
    try {
      await this.publishNotification();
    } catch (e) {
      hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `updateAudioMutedState publish failed: ${(e as Error).message}`);
    }
  }

  /** 创建"挂断"按钮的 wantAgent(发 EVT_HANG_UP 公共事件)。 */
  private async buildHangUpWantAgent(): Promise<WantAgent> {
    const info: wantAgent.WantAgentInfo = {
      wants: [{
        action: JitsiOngoingConferenceModule.EVT_HANG_UP,
        parameters: {}
      }],
      actionType: wantAgent.OperationType.SEND_COMMON_EVENT,
      requestCode: 0,
      actionFlags: [wantAgent.WantAgentFlags.CONSTANT_FLAG]
    };
    return await wantAgent.getWantAgent(info);
  }

  /**
   * 创建"静音/取消静音"按钮的 wantAgent(发 EVT_SET_AUDIO_MUTED,带目标 muted)。
   * muted = !当前状态(点击即切换):当前已静音→按钮显示 Unmute→点击设 muted=false;反之。
   */
  private async buildMuteWantAgent(): Promise<WantAgent> {
    const targetMuted = !this.isAudioMuted;
    const info: wantAgent.WantAgentInfo = {
      wants: [{
        action: JitsiOngoingConferenceModule.EVT_SET_AUDIO_MUTED,
        parameters: { muted: targetMuted }
      }],
      actionType: wantAgent.OperationType.SEND_COMMON_EVENT,
      requestCode: 1,
      actionFlags: [wantAgent.WantAgentFlags.CONSTANT_FLAG]
    };
    return await wantAgent.getWantAgent(info);
  }

  /** 创建"点通知主体返回会议"的 wantAgent(拉起宿主 EntryAbility)。失败返回 undefined。 */
  private async buildLaunchAppWantAgent(): Promise<WantAgent | undefined> {
    try {
      const bundleName = JitsiOngoingConferenceModule.launchBundleName || this.getOwnBundleName();
      const abilityName = JitsiOngoingConferenceModule.launchAbilityName || 'EntryAbility';
      if (!bundleName) {
        return undefined;
      }
      const info: wantAgent.WantAgentInfo = {
        wants: [{
          bundleName,
          abilityName,
          parameters: {}
        }],
        actionType: wantAgent.OperationType.START_ABILITY,
        requestCode: 2,
        actionFlags: [wantAgent.WantAgentFlags.CONSTANT_FLAG]
      };
      return await wantAgent.getWantAgent(info);
    } catch (e) {
      hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `buildLaunchAppWantAgent failed (notification tap-to-return disabled): ${(e as Error).message}`);
      return undefined;
    }
  }

  /** 取本应用 bundleName(HAR 运行在宿主进程,bundleManager 取到的是宿主包名)。 */
  private getOwnBundleName(): string {
    try {
      const info = bundleManager.getBundleInfoForSelfSync(
        bundleManager.BundleFlag.GET_BUNDLE_INFO_DEFAULT
      );
      return info.name;
    } catch (e) {
      return '';
    }
  }

  /** 构建并发布常驻通知(同 ID 覆盖更新)。 */
  private async publishNotification(): Promise<void> {
    const hangUpWA = await this.buildHangUpWantAgent();
    const muteWA = await this.buildMuteWantAgent();
    const launchWA = await this.buildLaunchAppWantAgent();

    const muteTitle = this.isAudioMuted ? '取消静音' : '静音';

    // ArkTS 不允许对象字面量直接赋给联合类型,逐字段构造。
    const hangUpButton: notificationManager.NotificationActionButton = {
      title: '挂断',
      wantAgent: hangUpWA
    };
    const muteButton: notificationManager.NotificationActionButton = {
      title: muteTitle,
      wantAgent: muteWA
    };

    const request: notificationManager.NotificationRequest = {
      id: JitsiOngoingConferenceModule.NOTIFICATION_ID,
      // SOCIAL_COMMUNICATION:社交沟通类,系统按较高重要性展示(接近 android CATEGORY_CALL)。
      notificationSlotType: notificationManager.SlotType.SOCIAL_COMMUNICATION,
      content: {
        notificationContentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
        normal: {
          title: '会议进行中',
          text: '点击返回会议'
        }
      },
      // 通知按钮(最多2个)。点击触发各自 wantAgent(发公共事件),不自动消失(tapDismissed=false
      // 让挂断/静音点击后通知保留,会议结束由 abort 取消;挂断按钮事件回 JS 后 JS 挂断→
      // conference=null→middleware 调 abort,链路自洽)。
      actionButtons: [hangUpButton, muteButton],
      // 点击通知主体不自动消失(常驻,直到 abort)。
      tapDismissed: false,
      // 仅首次发布提醒一次,后续 publish 刷新(静音状态更新)降级为 LEVEL_LOW 不重复打扰。
      // 对齐 android setOnlyAlertOnce(true)。
      isAlertOnce: true
    };

    // 通知主体点击 → 拉起宿主返回会议(若构建成功)。
    if (launchWA) {
      request.wantAgent = launchWA;
    }

    await notificationManager.publish(request);
  }

  /** 订阅挂断/静音公共事件(幂等)。 */
  private async ensureSubscribed(): Promise<void> {
    if (this.isSubscribing || this.subscriber) {
      return;
    }
    this.isSubscribing = true;
    try {
      const subscribeInfo: commonEventManager.CommonEventSubscribeInfo = {
        events: [JitsiOngoingConferenceModule.EVT_HANG_UP, JitsiOngoingConferenceModule.EVT_SET_AUDIO_MUTED],
        // 只接收本应用发布的事件(避免收到别的应用同名事件)。
        publisherBundleName: this.getOwnBundleName()
      };
      const sub = await commonEventManager.createSubscriber(subscribeInfo);
      this.subscriber = sub;
      commonEventManager.subscribe(sub, (err: BusinessError, data: commonEventManager.CommonEventData) => {
        if (err) {
          hilog.error(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
            `commonEvent subscribe callback err: ${err.code} ${err.message}`);
          return;
        }
        this.handleCommonEvent(data);
      });
      hilog.info(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG, 'subscribed ongoing-conference common events');
    } catch (e) {
      hilog.error(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `ensureSubscribed failed: ${(e as Error).message}`);
    } finally {
      this.isSubscribing = false;
    }
  }

  /** 解订阅(幂等)。 */
  private async unsubscribe(): Promise<void> {
    if (this.subscriber) {
      try {
        await commonEventManager.unsubscribe(this.subscriber);
      } catch (e) {
        hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
          `unsubscribe failed: ${(e as Error).message}`);
      }
      this.subscriber = undefined;
    }
  }

  /** 处理收到的公共事件 → 转 ACTION_EVENT 下发 JS。 */
  private handleCommonEvent(data: commonEventManager.CommonEventData): void {
    const event = data?.event ?? '';
    const parameters = (data?.parameters ?? {}) as Record<string, Object>;

    let action: string = '';
    let muted = false;
    if (event === JitsiOngoingConferenceModule.EVT_HANG_UP) {
      action = 'hangUp';
    } else if (event === JitsiOngoingConferenceModule.EVT_SET_AUDIO_MUTED) {
      action = 'setAudioMuted';
      muted = parameters?.muted === true;
    } else {
      return;
    }

    try {
      const payload: OngoingConferenceActionEvent = {
        action,
        muted
      };
      this.ctx.rnInstance.emitDeviceEvent(OngoingConferenceConstants.ACTION_EVENT, payload);
    } catch (e) {
      hilog.warn(JitsiOngoingConferenceModule.DOMAIN, JitsiOngoingConferenceModule.TAG,
        `emitDeviceEvent failed: ${(e as Error).message}`);
    }
  }
}
