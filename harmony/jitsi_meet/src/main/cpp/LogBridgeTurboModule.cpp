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

#include "LogBridgeTurboModule.h"

namespace rnoh {

// 纯转发:JS LogTransport -> cpp -> ArkTS LogBridgeModule.{trace|debug|info|log|warn|error}
// 6 个 level 方法,各 1 参(message),同步。
LogBridgeTurboModule::LogBridgeTurboModule(
    const ArkTSTurboModule::Context ctx, const std::string name)
    : ArkTSTurboModule(ctx, name)
{
    methodMap_ = {
        ARK_METHOD_METADATA(trace, 1),
        ARK_METHOD_METADATA(debug, 1),
        ARK_METHOD_METADATA(info, 1),
        ARK_METHOD_METADATA(log, 1),
        ARK_METHOD_METADATA(warn, 1),
        ARK_METHOD_METADATA(error, 1),
    };
}

} // namespace rnoh
