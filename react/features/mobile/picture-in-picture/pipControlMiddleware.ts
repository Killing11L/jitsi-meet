/* eslint-disable lines-around-comment */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import { APP_WILL_MOUNT, APP_WILL_UNMOUNT } from '../../base/app/actionTypes';
import { IStore } from '../../app/types';
import { hangup } from '../../base/connection/actions.native';
import { setAudioMuted, setVideoMuted } from '../../base/media/actions';
import { VIDEO_MUTISM_AUTHORITY } from '../../base/media/constants';
import MiddlewareRegistry from '../../base/redux/MiddlewareRegistry';

import logger from './logger';

/**
 * HarmonyOS-only. Event name emitted by PictureInPictureModule when a PiP
 * control-panel button is tapped. Mirrors the native constant
 * PictureInPictureModule.PIP_CONTROL_EVENT. Kept in sync manually since the
 * ExternalAPI module is already in use as the JS<->native event bus for
 * several other features, and we piggy-back on the same channel.
 *
 * Event payload: { event: PiPMeetingActionEvent, status?: number }
 *   event  : 'hangUp' | 'voiceStateChanged' | 'videoStateChanged' | 'micStateChanged'
 *   status : 1 = OPEN (unmute/on), 0 = CLOSE (mute/off), -1 = default (e.g. hangUp)
 */
export const PIP_CONTROL_EVENT = 'org.jitsi.meet:features/picture-in-picture#control';

const { PictureInPicture } = NativeModules;

// NativeEventEmitter requires a non-null native module. On non-harmony platforms
// PictureInPicture may be undefined, so we guard the whole middleware with a
// platform check and a null check.
const isHarmonyPiPAvailable = Platform.OS === 'harmony'
    && Boolean(PictureInPicture);

let pipEmitter: any;

if (isHarmonyPiPAvailable) {
    pipEmitter = new NativeEventEmitter(PictureInPicture);
}

/**
 * Middleware that listens for HarmonyOS PiP control-panel button taps
 * (hang up / microphone / camera) and dispatches the corresponding media
 * action, so taps on the floating PiP window actually take effect.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
isHarmonyPiPAvailable && MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case APP_WILL_MOUNT:
        _registerPiPControlListeners(store);
        break;
    case APP_WILL_UNMOUNT:
        _unregisterPiPControlListeners();
        break;
    }

    return next(action);
});

let _subscriptions: Array<{ remove: () => void }> | undefined;

/**
 * Subscribes to PiP control-panel events emitted by the native
 * PictureInPictureModule and dispatches media actions.
 *
 * @param {Store} store - The redux store.
 * @private
 * @returns {void}
 */
function _registerPiPControlListeners(store: IStore) {
    if (_subscriptions) {
        return;
    }

    const { dispatch } = store;

    // Ask the native module to (idempotently) wire its PiP control-panel
    // callback to emitDeviceEvent. If globalThis.rnohPiPBridge wasn't ready at
    // JS load time, the native side keeps a pending flag and retries on the
    // next enterPictureInPicture call.
    try {
        PictureInPicture?.registerPiPControlListener?.();
    } catch (e) {
        logger.warn(`registerPiPControlListener failed: ${e}`);
    }

    _subscriptions = [
        pipEmitter.addListener(PIP_CONTROL_EVENT, ({ event, status }: any) => {
            switch (event) {
            case 'hangUp':
                dispatch(hangup());
                break;

            case 'micStateChanged':
                // status: OPEN(1)=mic on/unmuted, CLOSE(0)=mic off/muted
                dispatch(setAudioMuted(status !== 1));
                break;

            case 'videoStateChanged':
                // status: OPEN(1)=camera on, CLOSE(0)=camera off/muted
                dispatch(setVideoMuted(status !== 1, VIDEO_MUTISM_AUTHORITY.USER));
                break;

            case 'voiceStateChanged':
                // voiceStateChanged on the VIDEO_MEETING template maps to the
                // mute switch (speaker mute), which we treat the same as mic mute
                // because jitsi's audio path has no separate "voice mute" concept.
                dispatch(setAudioMuted(status !== 1));
                break;

            default:
                logger.warn(`Unknown PiP control event: ${event}`);
                break;
            }
        })
    ];
}

/**
 * Removes all PiP control-panel event subscriptions.
 *
 * @private
 * @returns {void}
 */
function _unregisterPiPControlListeners() {
    if (_subscriptions) {
        for (const subscription of _subscriptions) {
            subscription.remove();
        }
        _subscriptions = undefined;
    }
}
