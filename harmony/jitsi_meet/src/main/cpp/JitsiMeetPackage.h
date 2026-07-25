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

#pragma once

#include "RNOH/Package.h"
#include "RNOH/ArkTSTurboModule.h"

#include "AppInfoTurboModule.h"
#include "LogBridgeTurboModule.h"
#include "AudioModeTurboModule.h"
#include "ExternalAPITurboModule.h"
#include "PictureInPictureTurboModule.h"
#include "ProximityTurboModule.h"
#include "DropboxTurboModule.h"
#include "ConnectionServiceTurboModule.h"
#include "LocaleDetectorTurboModule.h"
#include "JitsiOngoingConferenceTurboModule.h"

namespace rnoh {

// TurboModule 工厂:按 JS 侧 NativeModules.X 的 X 名路由到对应 cpp TurboModule。
// name 必须与 ArkTS 各 module 的 public static readonly NAME 一致,
// 也与 android getName() 返回值一致。
class JitsiMeetTurboModuleFactoryDelegate : public TurboModuleFactoryDelegate {
  public:
    SharedTurboModule createTurboModule(Context ctx, const std::string &name) const override {
        if (name == "AppInfo") {
            return std::make_shared<AppInfoTurboModule>(ctx, name);
        }
        if (name == "LogBridge") {
            return std::make_shared<LogBridgeTurboModule>(ctx, name);
        }
        if (name == "AudioMode") {
            return std::make_shared<AudioModeTurboModule>(ctx, name);
        }
        if (name == "PictureInPicture") {
            return std::make_shared<PictureInPictureTurboModule>(ctx, name);
        }
        if (name == "Proximity") {
            return std::make_shared<ProximityTurboModule>(ctx, name);
        }
        if (name == "Dropbox") {
            return std::make_shared<DropboxTurboModule>(ctx, name);
        }
        if (name == "ConnectionService") {
            return std::make_shared<ConnectionServiceTurboModule>(ctx, name);
        }
        if (name == "LocaleDetector") {
            return std::make_shared<LocaleDetectorTurboModule>(ctx, name);
        }
        if (name == "JMOngoingConference") {
            return std::make_shared<JitsiOngoingConferenceTurboModule>(ctx, name);
        }
        return nullptr;
    }
};

// jitsi-meet 鸿蒙化 cpp Package。
// 纯 ArkTS TurboModule 库(无自定义 cpp 组件),不注册 ComponentDescriptor / JSIBinder。
// 在壳工程 PackageProvider.cpp 里 std::make_shared<JitsiMeetPackage>(ctx) 接入。
class JitsiMeetPackage : public Package {
  public:
    JitsiMeetPackage(Package::Context ctx) : Package(ctx){};

    std::unique_ptr<TurboModuleFactoryDelegate> createTurboModuleFactoryDelegate() override {
        return std::make_unique<JitsiMeetTurboModuleFactoryDelegate>();
    }

    std::vector<facebook::react::ComponentDescriptorProvider> createComponentDescriptorProviders() override {
        return {};
    }

    ComponentJSIBinderByString createComponentJSIBinderByName() override {
        return {};
    }
};

} // namespace rnoh
