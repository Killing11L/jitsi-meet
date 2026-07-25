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

import { TurboModulesFactory } from '@rnoh/react-native-openharmony/ts';
import type {
  UITurboModule, TurboModuleContext
} from '@rnoh/react-native-openharmony/ts';
import { RNOHPackage } from '@rnoh/react-native-openharmony'

import { AppInfoModule } from './modules/AppInfoModule';
import { LogBridgeModule } from './modules/LogBridgeModule';
import { AudioModeModule } from './modules/AudioModeModule';
import { ExternalAPIModule } from './modules/ExternalAPIModule';
import { PictureInPictureModule } from './modules/PictureInPictureModule';
import { ProximityModule } from './modules/ProximityModule';
import { DropboxModule } from './modules/DropboxModule';
import { ConnectionServiceModule } from './modules/ConnectionServiceModule';
import { LocaleDetectorModule } from './modules/LocaleDetectorModule';
import { JitsiOngoingConferenceModule } from './modules/JitsiOngoingConferenceModule';

/**
 * jitsi-meet 鸿蒙化 TurboModule 工厂。
 *
 * 桥接 android/sdk 各 NativeModule 的 ArkTS 实现,按 module 名路由。
 * 名字需与 JS 侧 `NativeModules.X` 的 X 以及 java `getName()` 返回值一致。
 */
class JitsiMeetTurboModulesFactory extends TurboModulesFactory {
  createTurboModule(name: string): UITurboModule | null {
    switch (name) {
      case 'AppInfo':
        return new AppInfoModule(this.ctx);
      case 'LogBridge':
        return new LogBridgeModule(this.ctx);
      case 'AudioMode':
        return new AudioModeModule(this.ctx);
      case 'PictureInPicture':
        return new PictureInPictureModule(this.ctx);
      case 'Proximity':
        return new ProximityModule(this.ctx);
      case 'Dropbox':
        return new DropboxModule(this.ctx);
      case 'ConnectionService':
        return new ConnectionServiceModule(this.ctx);
      case 'LocaleDetector':
        return new LocaleDetectorModule(this.ctx);
      case 'JMOngoingConference':
        return new JitsiOngoingConferenceModule(this.ctx);
    }
    return null;
  }

  hasTurboModule(name: string): boolean {
    return [
      'AppInfo', 'LogBridge', 'AudioMode',
      'PictureInPicture', 'Proximity', 'Dropbox',
      'ConnectionService', 'LocaleDetector', 'JMOngoingConference'
    ].includes(name);
  }
}

/**
 * jitsi-meet 鸿蒙化 Package。
 *
 * 纯 ArkTS TurboModule 库(无自定义 cpp 组件),因此只覆写
 * createTurboModulesFactory,不注册原生组件。
 * 在壳工程 RNPackagesFactory.ets 里 new JitsiMeetPackage(ctx) 完成接入。
 */
export class JitsiMeetPackage extends RNOHPackage {
  createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
    return new JitsiMeetTurboModulesFactory(ctx);
  }
}
