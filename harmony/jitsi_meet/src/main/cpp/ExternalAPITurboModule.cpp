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

#include "ExternalAPITurboModule.h"

namespace rnoh {

// 纯转发:JS -> cpp -> ArkTS ExternalAPIModule.*
//  - getConstants():同步,返回 17 个 BroadcastAction 常量。
//  - addListener/removeListeners:RN 内置 EventEmitter 要求的占位方法,同步。
//  - sendEvent(name,data) / emitToJS(name,data):各 2 参,同步。
ExternalAPITurboModule::ExternalAPITurboModule(
    const ArkTSTurboModule::Context ctx, const std::string name)
    : ArkTSTurboModule(ctx, name)
{
    methodMap_ = {
        ARK_METHOD_METADATA(getConstants, 0),
        ARK_METHOD_METADATA(addListener, 1),
        ARK_METHOD_METADATA(removeListeners, 1),
        ARK_METHOD_METADATA(sendEvent, 2),
        ARK_METHOD_METADATA(emitToJS, 2),
    };
}

} // namespace rnoh
