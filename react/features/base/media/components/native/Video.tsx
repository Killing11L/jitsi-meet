import React, { Component } from 'react';
import { GestureResponderEvent, Platform } from 'react-native';
import { MediaStream, RTCView } from 'react-native-webrtc';

import Pressable from '../../../react/components/native/Pressable';

import VideoTransform from './VideoTransform';
import styles from './styles';

/**
 * The type of the React {@code Component} props of {@link Video}.
 */
interface IProps {
    mirror: boolean;

    onPlaying: Function;

    /**
     * Callback to invoke when the {@code Video} is clicked/pressed.
     */
    onPress?: (event: GestureResponderEvent) => void;

    stream: MediaStream;

    /**
     * Similarly to the CSS property z-index, specifies the z-order of this
     * Video in the stacking space of all Videos. When Videos overlap,
     * zOrder determines which one covers the other. A Video with a larger
     * zOrder generally covers a Video with a lower one.
     *
     * Non-overlapping Videos may safely share a z-order (because one does
     * not have to cover the other).
     *
     * The support for zOrder is platform-dependent and/or
     * implementation-specific. Thus, specifying a value for zOrder is to be
     * thought of as giving a hint rather than as imposing a requirement.
     * For example, video renderers such as Video are commonly implemented
     * using OpenGL and OpenGL views may have different numbers of layers in
     * their stacking space. Android has three: a layer below the window
     * (aka default), a layer below the window again but above the previous
     * layer (aka media overlay), and above the window. Consequently, it is
     * advisable to limit the number of utilized layers in the stacking
     * space to the minimum sufficient for the desired display. For example,
     * a video call application usually needs a maximum of two zOrder
     * values: 0 for the remote video(s) which appear in the background, and
     * 1 for the local video(s) which appear above the remote video(s).
     */
    zOrder?: number;

    /**
     * Indicates whether zooming (pinch to zoom and/or drag) is enabled.
     */
    zoomEnabled: boolean;
}

/**
 * The React Native {@link Component} which is similar to Web's
 * {@code HTMLVideoElement} and wraps around react-native-webrtc's
 * {@link RTCView}.
 */
export default class Video extends Component<IProps> {
    /**
     * React Component method that executes once component is mounted.
     *
     * @inheritdoc
     */
    override componentDidMount() {
        // RTCView currently does not support media events, so just fire
        // onPlaying callback when <RTCView> is rendered.
        const { onPlaying } = this.props;

        onPlaying?.();
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement|null}
     */
    override render() {
        const { onPress, stream, zoomEnabled } = this.props;

        if (stream) {
            // RTCView
            const style = styles.video;
            const objectFit
                = zoomEnabled
                    ? 'contain'
                    : 'cover';

            // HarmonyOS: only the conference LargeVideo (zOrder === 0) is marked as
            // the Picture-in-Picture source. Filmstrip thumbnails use zOrder === 1.
            // This makes the RTCView auto-register with the native PiPManager so the
            // toolbar PiP button / hardware back / background-switch can shrink it.
            const iosPIP
                = Platform.OS === 'harmony' && this.props.zOrder === 0
                    ? {
                        enabled: true,
                        startAutomatically: true,
                        stopAutomatically: true,

                        // HarmonyOS PiPTemplateType.VIDEO_MEETING (=2): this is a meeting
                        // app. The shared webrtc module defaults to VIDEO_CALL; the
                        // meeting type is chosen here by the consumer, not hardcoded there.
                        templateType: 2,

                        // HarmonyOS VideoMeetingControlGroup buttons on the PiP window.
                        // 枚举值(须与 templateType=VIDEO_MEETING 匹配, 最多 3 个, 顺序即面板顺序):
                        //   301 = HANG_UP_BUTTON, 304 = MICROPHONE_SWITCH, 302 = CAMERA_SWITCH
                        // 控件按钮点击事件由 webrtc PiPManager 收集后,经 globalThis.rnohPiPBridge
                        // 多订阅透传到 jitsi PictureInPictureModule,再由 pipControlMiddleware
                        // 派发为 hangup/setAudioMuted/setVideoMuted。需 webrtc HAR 已修复
                        // controlEventCallback 单槽抢占(改为多订阅)方才生效。
                        controlGroups: [ 301, 304, 302 ]
                    }
                    : undefined;
            const rtcView
                = (
                    <RTCView
                        iosPIP = { iosPIP }
                        mirror = { this.props.mirror }
                        objectFit = { objectFit }
                        streamURL = { stream.toURL() }
                        style = { style }
                        zOrder = { this.props.zOrder } />
                );

            // VideoTransform implements "pinch to zoom". As part of "pinch to
            // zoom", it implements onPress, of course.
            if (zoomEnabled) {
                return (
                    <VideoTransform
                        enabled = { zoomEnabled }
                        onPress = { onPress }
                        streamId = { stream.id }
                        style = { style }>
                        { rtcView }
                    </VideoTransform>
                );
            }

            // XXX Unfortunately, VideoTransform implements a custom press
            // detection which has been observed to be very picky about the
            // precision of the press unlike the builtin/default/standard press
            // detection which is forgiving to imperceptible movements while
            // pressing. It's not acceptable to be so picky, especially when
            // "pinch to zoom" is not enabled.
            return (
                <Pressable onPress = { onPress }>
                    { rtcView }
                </Pressable>
            );
        }

        // RTCView has peculiarities which may or may not be platform specific.
        // For example, it doesn't accept an empty streamURL. If the execution
        // reached here, it means that we explicitly chose to not initialize an
        // RTCView as a way of dealing with its idiosyncrasies.
        return null;
    }
}
