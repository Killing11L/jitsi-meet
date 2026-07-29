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

import i18n from '@ohos.i18n';
import { UITurboModule } from '@rnoh/react-native-openharmony';
import { LocaleDetectorConstants } from '../Type';

/**
 * 对应 android/sdk 的 LocaleDetector (NativeModules.LocaleDetector)。
 *
 * 仅暴露常量 locale 给 i18next 语言探测使用。
 * JS 侧调用点:react/features/base/i18n/languageDetector.native.ts。
 *
 * @ohos.i18n.System.getSystemLanguage() 返回 BCP-47 语言标签,
 * 等价于 android Configuration.locale.toLanguageTag()。
 */
export class LocaleDetectorModule extends UITurboModule {
  public static readonly NAME = 'LocaleDetector';

  getConstants(): LocaleDetectorConstants {
    let locale = '';
    try {
      locale = i18n?.System?.getSystemLanguage?.() ?? '';
    } catch (e) {
      // 取不到则保持空串,不阻断模块初始化。
      locale = '';
    }
    const constants: LocaleDetectorConstants = {
      locale
    };
    return constants;
  }
}
