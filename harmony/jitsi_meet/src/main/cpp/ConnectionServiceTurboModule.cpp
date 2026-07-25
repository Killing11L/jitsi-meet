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

#include "ConnectionServiceTurboModule.h"

namespace rnoh {

// 纯转发:JS -> cpp -> ArkTS ConnectionServiceModule.*
// 同步:addListener/removeListeners/reportCallFailed/endCall/updateCall
// 异步(返回 Promise):startCall(callUUID,handle,hasVideo)/reportConnectedOutgoingCall(callUUID)
ConnectionServiceTurboModule::ConnectionServiceTurboModule(
    const ArkTSTurboModule::Context ctx, const std::string name)
    : ArkTSTurboModule(ctx, name)
{
    methodMap_ = {
        ARK_METHOD_METADATA(addListener, 1),
        ARK_METHOD_METADATA(removeListeners, 1),
        ARK_ASYNC_METHOD_METADATA(startCall, 3),
        ARK_METHOD_METADATA(reportCallFailed, 1),
        ARK_METHOD_METADATA(endCall, 1),
        ARK_ASYNC_METHOD_METADATA(reportConnectedOutgoingCall, 1),
        ARK_METHOD_METADATA(updateCall, 2),
    };
}

} // namespace rnoh
