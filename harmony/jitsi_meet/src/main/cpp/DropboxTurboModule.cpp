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

#include "DropboxTurboModule.h"

namespace rnoh {

// 纯转发:JS -> cpp -> ArkTS DropboxModule.*
//  - getConstants():同步,返回 { ENABLED }。
//  - authorize():0 参,返回 Promise(异步)。
//  - getDisplayName(token)/getSpaceUsage(token):各 1 参,返回 Promise(异步)。
DropboxTurboModule::DropboxTurboModule(
    const ArkTSTurboModule::Context ctx, const std::string name)
    : ArkTSTurboModule(ctx, name)
{
    methodMap_ = {
        ARK_METHOD_METADATA(getConstants, 0),
        ARK_ASYNC_METHOD_METADATA(authorize, 0),
        ARK_ASYNC_METHOD_METADATA(getDisplayName, 1),
        ARK_ASYNC_METHOD_METADATA(getSpaceUsage, 1),
    };
}

} // namespace rnoh
