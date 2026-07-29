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

#include "AudioModeTurboModule.h"

namespace rnoh {

// 纯转发:JS -> cpp -> ArkTS AudioModeModule.*
// 同步:getConstants/addListener/removeListeners/setAudioDevice/setUseConnectionService/updateDeviceList
// 异步(返回 Promise):setDisabled(disabled)/setMode(mode)
// 设备变更事件由 ArkTS 侧 emitDeviceEvent('org.jitsi.meet:features/audio-mode#devices-update', ...) 上抛。
AudioModeTurboModule::AudioModeTurboModule(
    const ArkTSTurboModule::Context ctx, const std::string name)
    : ArkTSTurboModule(ctx, name)
{
    methodMap_ = {
        ARK_METHOD_METADATA(getConstants, 0),
        ARK_METHOD_METADATA(addListener, 1),
        ARK_METHOD_METADATA(removeListeners, 1),
        ARK_METHOD_METADATA(setAudioDevice, 1),
        ARK_ASYNC_METHOD_METADATA(setDisabled, 1),
        ARK_ASYNC_METHOD_METADATA(setMode, 1),
        ARK_METHOD_METADATA(setUseConnectionService, 1),
        ARK_METHOD_METADATA(updateDeviceList, 0),
    };
}

} // namespace rnoh
