/* eslint-disable lines-around-comment */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import { APP_WILL_MOUNT, APP_WILL_UNMOUNT } from '../../base/app/actionTypes';
import { IStore } from '../../app/types';
import { hangup } from '../../base/connection/actions.native';
import { SET_AUDIO_MUTED } from '../../base/media/actionTypes';
import { setAudioMuted } from '../../base/media/actions';
import MiddlewareRegistry from '../../base/redux/MiddlewareRegistry';

import logger from './logger';

/**
 * HarmonyOS-only. Event name emitted by JitsiOngoingConferenceModule
 * (NativeModules.JMOngoingConference) when a "meeting in progress" notification
 * button (hang up / mute) is tapped. Mirrors the native constant
 * OngoingConferenceConstants.ACTION_EVENT (Type.ets).
 *
 * Event payload: { action: 'hangUp' | 'setAudioMuted', muted?: boolean }
 *   action : 'hangUp' (end the conference) | 'setAudioMuted' (toggle mic)
 *   muted  : target mute state carried by the mute button's WantAgent (toggle).
 */
export const ONGOING_CONFERENCE_ACTION_EVENT = 'org.jitsi.meet:features/ongoing-conference#action';

const { JMOngoingConference } = NativeModules;

// NativeEventEmitter requires a non-null native module. On non-harmony platforms
// JMOngoingConference is null/undefined, so we guard the whole middleware with a
// platform check and a null check.
const isHarmonyOngoingAvailable = Platform.OS === 'harmony'
    && Boolean(JMOngoingConference);

let actionEmitter: any;

if (isHarmonyOngoingAvailable) {
    actionEmitter = new NativeEventEmitter(JMOngoingConference);
}

/**
 * Middleware that listens for HarmonyOS "meeting in progress" notification
 * button taps (hang up / mute) and dispatches the corresponding action, so taps
 * on the notification actually take effect. Also keeps the notification's mute
 * button label (Mute/Unmute) in sync with the local audio-mute state.
 *
 * The notification is shown/cancelled by react-native-sdk/middleware.js, which
 * watches the conference state and calls JMOngoingConference.launch()/abort().
 * This middleware only handles button interaction and mute-state sync.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
isHarmonyOngoingAvailable && MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case APP_WILL_MOUNT:
        _registerActionListeners(store);
        break;
    case APP_WILL_UNMOUNT:
        _unregisterActionListeners();
        break;

    case SET_AUDIO_MUTED: {
        // Local mute state changed → refresh the notification's mute button label.
        try {
            JMOngoingConference?.updateAudioMutedState?.(Boolean((action as any).muted));
        } catch (e) {
            logger.warn(`updateAudioMutedState failed: ${e}`);
        }
        break;
    }
    }

    return next(action);
});

let _subscriptions: Array<{ remove: () => void }> | undefined;

/**
 * Subscribes to the notification button action events emitted by the native
 * JitsiOngoingConferenceModule and dispatches the corresponding media actions.
 *
 * @param {Store} store - The redux store.
 * @private
 * @returns {void}
 */
function _registerActionListeners({ dispatch }: IStore) {
    if (_subscriptions) {
        return;
    }

    _subscriptions = [
        actionEmitter.addListener(ONGOING_CONFERENCE_ACTION_EVENT, ({ action, muted }: any) => {
            switch (action) {
            case 'hangUp':
                dispatch(hangup());
                break;

            case 'setAudioMuted':
                // muted is the target mute state carried by the mute button's
                // WantAgent (clicking the button toggles the state).
                dispatch(setAudioMuted(Boolean(muted)));
                break;

            default:
                logger.warn(`Unknown ongoing-conference action: ${action}`);
                break;
            }
        })
    ];
}

/**
 * Removes all notification button action event subscriptions.
 *
 * @private
 * @returns {void}
 */
function _unregisterActionListeners() {
    if (_subscriptions) {
        for (const subscription of _subscriptions) {
            subscription.remove();
        }
        _subscriptions = undefined;
    }
}
