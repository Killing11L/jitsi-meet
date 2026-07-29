import { debounce } from 'lodash-es';
import { NativeModules } from 'react-native';

import { IParticipant } from '../../base/participants/types';

import { readyToClose } from './actions';


/**
 * Sends a specific event to the native counterpart of the External API. Native
 * apps may listen to such events via the mechanisms provided by the (native)
 * mobile Jitsi Meet SDK.
 *
 * @param {Object} store - The redux store.
 * @param {string} name - The name of the event to send.
 * @param {Object} data - The details/specifics of the event to send determined
 * by/associated with the specified {@code name}.
 * @returns {void}
 */
export function sendEvent(store: Object, name: string, data: Object) {
    // ExternalAPI 可能未注册(如鸿蒙纯 JS 集成模式,事件走 rnSdkHandlers 回退中间件,
    // 不依赖原生 ExternalAPI 模块)。这里判空避免 subtitles 等独立调用点
    // (notifyTranscriptionChunkReceived) 在 ExternalAPI===null 时抛
    // "Cannot read property 'sendEvent' of null"。主 external-api 中间件自身已有
    // externalAPIEnabled 守卫,不会走到这里,此守卫仅兜底其余调用点。
    const { ExternalAPI } = NativeModules;

    if (!ExternalAPI) {
        return;
    }

    ExternalAPI.sendEvent(name, data);
}

/**
 * Debounced sending of `readyToClose`.
 */
export const _sendReadyToClose = debounce(dispatch => {
    dispatch(readyToClose());
}, 2500, { leading: true });

/**
 * Returns a participant info object based on the passed participant object from redux.
 *
 * @param {Participant} participant - The participant object from the redux store.
 * @returns {Object} - The participant info object.
 */
export function participantToParticipantInfo(participant: IParticipant) {
    return {
        isLocal: participant.local,
        email: participant.email,
        name: participant.name,
        participantId: participant.id,
        displayName: participant.displayName,
        avatarUrl: participant.avatarURL,
        role: participant.role
    };
}
