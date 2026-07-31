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
import * as React from 'react';
import {
  Alert,
  Animated,
  Button,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Linking,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
// 用 react-native-safe-area-context 替代 RN 内置已弃用的 SafeAreaView。
// 本项目依赖的是鸿蒙适配版,通过 alias 同样暴露官方包名。
// 这里用到 SafeAreaProvider(提供 insets 上下文)与 useSafeAreaInsets
// (读取底部安全区,用于让抽屉避开手机导航键 / 手势条)。
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// 引入 SDK 主组件。JitsiMeeting 是对外唯一入口(forwardRef 组件)。
// 鸿蒙适配包为 @react-native-ohos/react-native-jitsi(其内置鸿蒙原生模块 oh-package 名为
// @react-native-ohos/jitsi-meet),通过 harmony.alias 暴露原名,
// 因此 import 仍用官方包名 @jitsi/react-native-sdk。
// 组件作为整个应用的【全屏背景层】渲染(absoluteFill,脱离任何 ScrollView),
// 故其本身可点击(prejoin 的按钮 / 输入框),但不会被外层布局带动滑动。
import { JitsiMeeting } from '@jitsi/react-native-sdk';
import type { JitsiRefProps } from '@jitsi/react-native-sdk';

/**
 * 接口测试 demo(依据 jitsi-rn-sdk-接口清单.csv):
 *   - JitsiMeeting 组件 props / ref / eventListeners:全屏背景渲染,正常接线。
 *   - 原生 TurboModule(AppInfo / AudioMode / ExternalAPI / ConnectionService /
 *     LocaleDetector / LogBridge / PictureInPicture / Proximity):
 *     (Dropbox 经评估确认鸿蒙不实现: 无鸿蒙化 Dropbox SDK,鸿蒙侧仅保留 ENABLED=false
 *      的防崩溃桩;demo 不再展示该功能。)
 *     通过 NativeModules.X 调用,按接口实际用法与真实返回结果逐项验证。
 *
 * 布局:JitsiMeeting 占满整屏作背景;下方功能区收纳进一个从底部弹出的抽屉,
 * 抽屉占屏幕 2/3,内部可上下滚动,下边缘留出安全距离避开手机导航键。
 * 调用结果统一写入抽屉底部的"事件日志"面板。
 */

const DEFAULT_SERVER = 'https://meet.jit.si';

/**
 * 47 个移动端功能标志(对齐 react/features/base/flags/constants.ts)。
 * 按 flag 控制的功能分组,def 为 constants.ts 声明的默认值;'自动检测'类
 * (pip/recording/live-streaming)按"通常可用"取 true,便于观察开关效果。
 * 键名一律用上游真实字符串(如 prejoinpage.enabled、toolbox.alwaysVisible),
 * 不做改写。平台专属(iOS/Android)的 3 个也列出,便于直观验证鸿蒙上的差异。
 */
type FlagDef = { key: string; label: string; def: boolean; note?: string };
type FlagGroup = { title: string; hint?: string; flags: FlagDef[] };

const FLAG_GROUPS: FlagGroup[] = [
  {
    title: '音频',
    flags: [
      { key: 'audio-device-button.enabled', label: '音频设备按钮', def: true },
      { key: 'audio-mute.enabled', label: '静音按钮', def: true },
      { key: 'audio-only.enabled', label: '纯音频按钮', def: true },
      { key: 'audio-focus.disabled', label: '禁用音频焦点', def: false }
    ]
  },
  {
    title: '视频 / 视图',
    flags: [
      { key: 'video-mute.enabled', label: '视频静音按钮', def: true },
      { key: 'video-share.enabled', label: '视频共享按钮', def: true },
      { key: 'toggle-camera-button.enabled', label: '切换摄像头按钮', def: true },
      { key: 'filmstrip.enabled', label: '影片条', def: true },
      { key: 'tile-view.enabled', label: '平铺视图', def: true }
    ]
  },
  {
    title: '通话 / 集成',
    hint: 'call-integration 在鸿蒙为桩(无系统通话集成),开关可见但底层 no-op。',
    flags: [
      { key: 'call-integration.enabled', label: '通话集成', def: true, note: '鸿蒙桩,no-op' },
      { key: 'add-people.enabled', label: '添加人员', def: true },
      { key: 'invite.enabled', label: '邀请', def: true },
      { key: 'invite-dial-in.enabled', label: '拨号邀请', def: true },
      { key: 'car-mode.enabled', label: '车载模式', def: true },
      { key: 'replace.participant', label: '替换参与者加入', def: false }
    ]
  },
  {
    title: '互动功能',
    flags: [
      { key: 'chat.enabled', label: '聊天', def: true },
      { key: 'raise-hand.enabled', label: '举手', def: true },
      { key: 'reactions.enabled', label: '表情反应', def: true },
      { key: 'close-captions.enabled', label: '隐藏式字幕', def: true },
      { key: 'kick-out.enabled', label: '踢出', def: true },
      { key: 'breakout-rooms.enabled', label: '分组讨论室', def: true },
      { key: 'lobby-mode.enabled', label: '大堂模式', def: true },
      { key: 'participants.enabled', label: '参与者面板', def: true },
      { key: 'speakerstats.enabled', label: '主讲人统计', def: true }
    ]
  },
  {
    title: '页面 / 工具栏',
    flags: [
      { key: 'prejoinpage.enabled', label: '加入前页面', def: true },
      { key: 'prejoinpage.hideDisplayName', label: '隐藏加入前显示名输入', def: false },
      { key: 'welcomepage.enabled', label: '欢迎页', def: false },
      { key: 'toolbox.enabled', label: '工具栏', def: true },
      { key: 'toolbox.alwaysVisible', label: '工具栏常驻显示', def: false },
      { key: 'overflow-menu.enabled', label: '溢出菜单', def: true },
      { key: 'meeting-name.enabled', label: '显示会议名称', def: true },
      { key: 'conference-timer.enabled', label: '会议计时器', def: true },
      { key: 'help.enabled', label: '帮助按钮', def: true },
      { key: 'settings.enabled', label: '设置', def: true },
      { key: 'calendar.enabled', label: '日历集成', def: true },
      { key: 'notifications.enabled', label: '通知', def: true }
    ]
  },
  {
    title: '安全 / 权限',
    flags: [
      { key: 'security-options.enabled', label: '安全选项按钮', def: true },
      { key: 'meeting-password.enabled', label: '会议密码按钮', def: true },
      { key: 'server-url-change.enabled', label: '允许修改服务器 URL', def: true },
      { key: 'unsaferoomwarning.enabled', label: '不安全房间警告', def: false }
    ]
  },
  {
    title: '录制 / 直播 / 画中画',
    hint: '录制与直播走服务端 Jibri(需部署),鸿蒙端只发指令;Dropbox 上传不可用。',
    flags: [
      { key: 'recording.enabled', label: '录制', def: true, note: '服务端 Jibri' },
      { key: 'live-streaming.enabled', label: '直播', def: true, note: '服务端 Jibri RTMP' },
      { key: 'pip.enabled', label: '画中画', def: true }
    ]
  },
  {
    title: '平台专属(iOS / Android)',
    hint: 'ios.* 在鸿蒙不生效(一个永不渲染、一个恒真);android.screensharing 在鸿蒙生效。',
    flags: [
      { key: 'android.screensharing.enabled', label: '屏幕共享(鸿蒙走此开关)', def: true },
      { key: 'ios.screensharing.enabled', label: 'iOS 屏幕共享', def: false, note: '鸿蒙不生效' },
      { key: 'ios.recording.enabled', label: 'iOS 录制', def: false, note: '鸿蒙恒真' }
    ]
  }
];

// resolution 是唯一 number 型 flag,单独用文本输入(留空=不设置,交给服务端)。

/**
 * 工具栏按钮 key(jitsi toolbar button keys)。勾选哪些,toolbarButtons 就传哪些。
 * 鸿蒙屏幕共享用 'desktop'(复用 ScreenSharingAndroidButton,底层 getDisplayMedia)。
 */
const TOOLBAR_KEYS = [
  'microphone', 'camera', 'chat', 'desktop', 'raisehand', 'tileview',
  'overflowmenu', 'hangup', 'closedcaptions', 'recording', 'livestreaming',
  'invite', 'security', 'settings', 'help', 'mute-everyone',
  'toggle-camera', 'videoquality', 'filmstrip', 'sharedvideo'
];

// 原生 TurboModule 句柄(NativeModules 在 RN 类型里为 any 索引签名,
// RNOH 下这些模块由 cpp JitsiMeetPackage 路由表注册,运行时一定存在;
// 此处统一带 ?. 容错,避免某模块未注册时整页崩溃)。
const NM = NativeModules as any;
const AppInfo = NM.AppInfo;
const AudioMode = NM.AudioMode;
const ExternalAPI = NM.ExternalAPI;
const ConnectionService = NM.ConnectionService;
// Dropbox 确认鸿蒙不实现(无鸿蒙化 Dropbox SDK),不再取用;原生侧保留 ENABLED=false 防崩溃桩。
const LocaleDetector = NM.LocaleDetector;
const LogBridge = NM.LogBridge;
const PictureInPicture = NM.PictureInPicture;
const Proximity = NM.Proximity;

/** 把任意值格式化为单行字符串用于日志展示。 */
const fmt = (v: any): string => {
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

// useSafeAreaInsets 必须在 SafeAreaProvider 内部使用,故拆出内层组件。
export const JitsiMeetingDemo = () => (
  <SafeAreaProvider>
    <InnerDemo />
  </SafeAreaProvider>
);

const InnerDemo = () => {
  // 用 null 初始化 ref,类型标注为 SDK 暴露的命令式句柄。
  const ref = React.useRef<JitsiRefProps>(null);
  const [room, setRoom] = React.useState('huxiaotest');
  const [token, setToken] = React.useState('');
  const [audioMuted, setAudioMuted] = React.useState(false);
  const [videoMuted, setVideoMuted] = React.useState(false);
  const [audioOnly, setAudioOnly] = React.useState(false);
  const [log, setLog] = React.useState<string[]>([]);

  // 挂断后 SDK 会触发 onReadyToClose;通过变更 key 重新挂载 JitsiMeeting 回到 prejoin。
  const [ meetingKey, setMeetingKey ] = React.useState(0);
  const remountingRef = React.useRef(false);

  // ===== flags prop 状态(47 个 + resolution 文本) =====
  // 初始化为各 flag 的默认值。flag/config 仅初始化时读入(useEffect([])),
  // 改动后需点"应用并重进"remount 生效。
  const [flagValues, setFlagValues] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    FLAG_GROUPS.forEach(g => g.flags.forEach(f => { init[f.key] = f.def; }));
    return init;
  });
  const [resolution, setResolution] = React.useState(''); // 留空=不设置

  // ===== config prop 状态 =====
  const [toolbarSelected, setToolbarSelected] = React.useState<string[]>([
    'microphone', 'camera', 'chat', 'desktop', 'raisehand', 'tileview',
    'overflowmenu', 'hangup'
  ]);
  const [startWithAudioMuted, setStartWithAudioMuted] = React.useState(false);
  const [startWithVideoMuted, setStartWithVideoMuted] = React.useState(false);
  const [hideConferenceTimer, setHideConferenceTimer] = React.useState(true);
  const [hideConferenceSubject, setHideConferenceSubject] = React.useState(true);
  const [prejoinPageEnabled, setPrejoinPageEnabled] = React.useState(true);
  const [hideDisplayName, setHideDisplayName] = React.useState(false);

  // 切换某个 flag 开关。
  const toggleFlag = React.useCallback((key: string) => {
    setFlagValues(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const toggleToolbar = React.useCallback((key: string) => {
    setToolbarSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  // 把 47 个 flag 组成传给 JitsiMeeting 的 flags 对象(resolution 留空则省略)。
  const flagsProp = React.useMemo(() => {
    const out: Record<string, boolean | number> = { ...flagValues };
    if (resolution.trim() !== '') {
      const n = Number(resolution);
      if (!Number.isNaN(n)) out['resolution'] = n;
    }
    return out;
  }, [flagValues, resolution]);

  // 把 config 各开关组成传给 JitsiMeeting 的 config 对象。
  const configProp = React.useMemo(() => ({
    hideConferenceTimer,
    hideConferenceSubject,
    toolbarButtons: toolbarSelected,
    startWithAudioMuted,
    startWithVideoMuted,
    prejoinPageEnabled,
    prejoinConfig: { hideDisplayName },
    // analytics 已确认鸿蒙不实现(Amplitude 无适配),置 disabled 不打点。
    analytics: { disabled: true }
  }), [
    hideConferenceTimer, hideConferenceSubject, toolbarSelected,
    startWithAudioMuted, startWithVideoMuted, prejoinPageEnabled, hideDisplayName
  ]);

  // 底部安全区:用于把抽屉抬起,避开手机导航键 / 手势条;兜底至少 16px 间距。
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom ?? 0, 16);

  // 抽屉占屏幕高度 2/3。
  const drawerHeight = React.useMemo(
    () => Math.round((Dimensions.get('window').height * 2) / 3),
    []
  );

  // 抽屉开合动画:0 = 关闭(滑出屏幕外),1 = 完全展开。
  const drawerAnim = React.useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // 关闭态:抽屉整体下移到屏幕之外(连同 bottomGap 一起藏起);展开态:回到 bottomGap 位置。
  const drawerShift = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerHeight + bottomGap, 0]
  });
  const overlayOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5]
  });

  const openDrawer = React.useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [drawerAnim]);

  const closeDrawer = React.useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setDrawerOpen(false);
    });
  }, [drawerAnim]);

  const appendLog = React.useCallback((line: string) => {
    // 鸿蒙 Hermes 的 Intl 支持不完整,Date.toLocaleTimeString() 会抛
    // "dateFormat not implemented";改用纯 Date getter 拼接 HH:MM:SS,不依赖 Intl。
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const ts = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    setLog(prev => [`${ts}  ${line}`, ...prev].slice(0, 120));
  }, []);

  // 应用 flags/config 改动:remount JitsiMeeting(空依赖读入,必须重新挂载才生效)。
  // 注意:必须走 closeDrawer 让 drawerAnim 动画值归零后再清 drawerOpen,
  // 否则会出现"drawerOpen=false 但 drawerAnim=1"的错乱态——抽屉停在展开位置却
  // pointerEvents=none,既点不动也无遮罩可关(表现为抽屉卡死)。
  const applyAndRemount = React.useCallback(() => {
    if (remountingRef.current) return;
    remountingRef.current = true;
    setMeetingKey(k => k + 1);
    // 立即把动画值同步归零(不等 240ms 动画),避免抽屉视觉滞留;再清状态收遮罩。
    drawerAnim.setValue(0);
    setDrawerOpen(false);
    setTimeout(() => { remountingRef.current = false; }, 500);
    appendLog('应用 flags/config -> remount 重进 prejoin');
  }, [appendLog, drawerAnim]);

  // 一键恢复全部默认。
  const resetAll = React.useCallback(() => {
    const init: Record<string, boolean> = {};
    FLAG_GROUPS.forEach(g => g.flags.forEach(f => { init[f.key] = f.def; }));
    setFlagValues(init);
    setResolution('');
    setToolbarSelected(['microphone', 'camera', 'chat', 'desktop', 'raisehand', 'tileview', 'overflowmenu', 'hangup']);
    setStartWithAudioMuted(false);
    setStartWithVideoMuted(false);
    setHideConferenceTimer(true);
    setHideConferenceSubject(true);
    setPrejoinPageEnabled(true);
    setHideDisplayName(false);
    appendLog('已恢复全部默认值(未应用,需点"应用并重进")');
  }, [appendLog]);

  /**
   * 统一执行一个接口调用并记录结果。
   * - 同步方法:记录返回值(undefined 也如实展示)。
   * - 异步方法(返回 Promise):await 后记录 resolve 值,或 reject 原因。
   */
  const run = React.useCallback(
    (label: string, fn: () => any) => {
      appendLog(`▶ ${label}`);
      try {
        const r = fn();
        if (r && typeof r.then === 'function') {
          r.then(
            (val: any) => appendLog(`  ✓ resolve: ${fmt(val)}`),
            (err: any) => appendLog(`  ✗ reject: ${err?.message ?? String(err)}`)
          );
        } else {
          appendLog(`  → ${fmt(r)}`);
        }
      } catch (e: any) {
        appendLog(`  ✗ throw: ${e?.message ?? String(e)}`);
      }
    },
    [appendLog]
  );

  /** 展示某个 getConstants() 返回的常量集合。 */
  const showConstants = React.useCallback(
    (label: string, obj: any) => {
      appendLog(`▶ ${label}`);
      appendLog(`  ${fmt(obj)}`);
    },
    [appendLog]
  );

  // 订阅 AudioMode 设备变更事件(事件名来自 getConstants().DEVICE_CHANGE_EVENT)。
  React.useEffect(() => {
    const c = AudioMode?.getConstants?.();
    const eventName = c?.DEVICE_CHANGE_EVENT;
    if (!eventName) {
      return;
    }
    const sub = DeviceEventEmitter.addListener(eventName, (devices: any) => {
      appendLog(`[AudioMode 事件] 设备列表变更: ${fmt(devices)}`);
    });
    return () => sub.remove();
  }, [appendLog]);

  // 事件回调集合:IEventListeners 契约的全部 12 项(对齐接口清单)。
  const eventListeners = React.useMemo(
    () => ({
      onConferenceWillJoin: () => appendLog('onConferenceWillJoin'),
      onConferenceJoined: () => appendLog('onConferenceJoined'),
      onConferenceLeft: () => appendLog('onConferenceLeft'),
      onConferenceBlurred: () => appendLog('onConferenceBlurred'),
      onConferenceFocused: () => appendLog('onConferenceFocused'),
      onAudioMutedChanged: () => appendLog('onAudioMutedChanged'),
      onVideoMutedChanged: () => appendLog('onVideoMutedChanged'),
      onParticipantJoined: () => appendLog('onParticipantJoined'),
      onParticipantLeft: ({ id }: { id: string }) => appendLog(`onParticipantLeft(id=${id})`),
      onEnterPictureInPicture: () => appendLog('onEnterPictureInPicture'),
      onEndpointMessageReceived: () => appendLog('onEndpointMessageReceived'),
      onReadyToClose: () => {
        appendLog('onReadyToClose -> 回到 prejoin');
        console.log(`MMMMMM onReadyToClose`)
        // SDK 无 welcome 页时挂断会走 readyToClose;重新挂载组件以回到 prejoin,而非卸载到外层加入页。
        if (remountingRef.current) {
          return;
        }
        remountingRef.current = true;
        setMeetingKey(k => k + 1);
        setTimeout(() => {
          remountingRef.current = false;
        }, 500);
      }
    }),
    [appendLog]
  );

  // ===== JitsiMeeting.ref 命令式 API =====
  const handleSetAudioMuted = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    ref.current?.setAudioMuted?.(next);
    appendLog(`ref.setAudioMuted(${next})`);
  };
  const handleSetVideoMuted = () => {
    const next = !videoMuted;
    setVideoMuted(next);
    ref.current?.setVideoMuted?.(next);
    appendLog(`ref.setVideoMuted(${next})`);
  };
  const handleSetAudioOnly = () => {
    const next = !audioOnly;
    setAudioOnly(next);
    ref.current?.setAudioOnly?.(next);
    appendLog(`ref.setAudioOnly(${next})`);
  };
  const handleGetRoomsInfo = () => {
    const info = ref.current?.getRoomsInfo?.();
    appendLog(`ref.getRoomsInfo() -> ${fmt(info)}`);
    Alert.alert('getRoomsInfo', fmt(info));
  };
  const handleClose = () => {
    ref.current?.close?.();
    appendLog('ref.close()');
  };

  // ===== 工具子组件:分区标题与按钮 =====
  const Section = ({ title, hint }: { title: string; hint?: string }) => (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
  const Btn = ({ title, color, onPress }: { title: string; color?: string; onPress: () => void }) => (
    <View style={styles.btn}>
      <Button title={title} color={color} onPress={onPress} />
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ===== 背景层:进入 demo 直接 prejoin;挂断后 remount 回到 prejoin ===== */}
      <View style={StyleSheet.absoluteFillObject}>
        <JitsiMeeting
          key={meetingKey}
          ref={ref}
          config={configProp}
          // flags:47 个移动端功能标志(见抽屉"功能标志"区块),改后需"应用并重进"。
          flags={flagsProp}
          // config 含 toolbar key 'desktop' 时,鸿蒙屏幕共享按钮复用 ScreenSharingAndroidButton,
          // 底层走 react-native-webrtc 的 getDisplayMedia(鸿蒙侧已实现)。
          room={room}
          serverURL={DEFAULT_SERVER}
          token={token}
          userInfo={{ displayName: 'rn-tester', email: '', avatarURL: '' }}
          eventListeners={eventListeners}
          style={[ styles.meeting, { marginBottom: bottomGap } ]}
        />
      </View>

      {/* ===== 悬浮入口:抽屉收起时显示,点击弹出接口测试抽屉 =====
          放在屏幕左侧垂直居中,避开底部 jitsi 工具栏区域。*/}
      {!drawerOpen && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={openDrawer}
        >
          <Text style={styles.fabText}>接口测试 ▲</Text>
        </TouchableOpacity>
      )}

      {/* ===== 抽屉遮罩:点击关闭抽屉 ===== */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* ===== 抽屉:从底部弹出,占屏幕 2/3,下边缘留出导航键安全距离 ===== */}
      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          { height: drawerHeight, bottom: bottomGap, transform: [{ translateY: drawerShift }] }
        ]}
      >
        {/* 把手 + 标题栏(固定不滚) */}
        <View style={styles.drawerHeader}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.h1}>@jitsi/react-native-sdk 接口测试</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={closeDrawer}>
              <Text style={styles.closeText}>收起 ▼</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.muted}>
            依据接口清单逐项验证。JitsiMeeting 作为全屏背景,本抽屉为各原生 TurboModule 接口测试用例,结果见下方日志。
          </Text>
        </View>

        {/* 可滚动内容区:抽屉内可上下滑动 */}
        <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
          {/* ============ JitsiMeeting props / ref ============ */}
          <Section title="JitsiMeeting · props / ref" hint="组件作为全屏背景渲染;props 接线与 ref 命令式 API 如下。" />

          <Text style={styles.label}>房间名 / room</Text>
          <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="room name" />

          <Text style={styles.label}>JWT 令牌 / token</Text>
          <TextInput style={styles.input} value={token} onChangeText={setToken} placeholder="jwt token (可选)" />

          <View style={styles.row}><Text style={styles.label}>音频静音: {String(audioMuted)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>视频关闭: {String(videoMuted)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>纯音频模式: {String(audioOnly)}</Text></View>

          <View style={styles.btnRow}>
            <Btn title="setAudioMuted" onPress={handleSetAudioMuted} />
            <Btn title="setVideoMuted" onPress={handleSetVideoMuted} />
            <Btn title="setAudioOnly" onPress={handleSetAudioOnly} />
            <Btn title="getRoomsInfo" onPress={handleGetRoomsInfo} />
            <Btn title="close" color="#d33" onPress={handleClose} />
          </View>

          <Section title="eventListeners(12 项)" hint="已注册全部回调;组件渲染并入会后由 SDK 触发。" />
          <Text style={styles.muted}>
            {Object.keys(eventListeners).join('  ·  ')}
          </Text>

          {/* ============ 功能标志 flags(47 项)============ */}
          <Section
            title="功能标志 flags(47 项)"
            hint="对齐 base/flags/constants.ts。改完务必点下方『应用并重进』— flags/config 仅初始化时读入,必须 remount 才生效。"
          />
          {FLAG_GROUPS.map(group => (
            <View key={group.title} style={styles.subGroup}>
              <Text style={styles.h3}>{group.title}</Text>
              {group.hint ? <Text style={styles.muted}>{group.hint}</Text> : null}
              {group.flags.map(f => (
                <View key={f.key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>
                    {f.label}
                    {f.note ? <Text style={styles.toggleNote}> · {f.note}</Text> : null}
                  </Text>
                  <Text
                    style={[
                      styles.switchBtn,
                      flagValues[f.key] ? styles.switchOn : styles.switchOff
                    ]}
                    onPress={() => toggleFlag(f.key)}
                  >
                    {flagValues[f.key] ? 'ON' : 'OFF'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          {/* resolution 是唯一 number 型 flag,单独文本输入 */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>resolution(number,留空=不设置)</Text>
            <TextInput
              style={styles.smallInput}
              value={resolution}
              onChangeText={setResolution}
              placeholder="如 360 / 720"
              keyboardType="numeric"
            />
          </View>

          {/* ============ 配置 config ============ */}
          <Section
            title="配置 config"
            hint="透传给 jitsi 引擎。toolbarButtons 决定工具栏出现哪些按钮,可多选。"
          />
          <Text style={styles.h3}>工具栏按钮 toolbarButtons(多选)</Text>
          <View style={styles.chipRow}>
            {TOOLBAR_KEYS.map(k => (
              <Text
                key={k}
                style={[
                  styles.chip,
                  toolbarSelected.includes(k) ? styles.chipOn : styles.chipOff
                ]}
                onPress={() => toggleToolbar(k)}
              >
                {toolbarSelected.includes(k) ? '✓ ' : ''}{k}
              </Text>
            ))}
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>startWithAudioMuted(入场静音)</Text>
            <Text
              style={[styles.switchBtn, startWithAudioMuted ? styles.switchOn : styles.switchOff]}
              onPress={() => setStartWithAudioMuted(v => !v)}
            >{startWithAudioMuted ? 'ON' : 'OFF'}</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>startWithVideoMuted(入场关摄像头)</Text>
            <Text
              style={[styles.switchBtn, startWithVideoMuted ? styles.switchOn : styles.switchOff]}
              onPress={() => setStartWithVideoMuted(v => !v)}
            >{startWithVideoMuted ? 'ON' : 'OFF'}</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>hideConferenceTimer(隐藏计时器)</Text>
            <Text
              style={[styles.switchBtn, hideConferenceTimer ? styles.switchOn : styles.switchOff]}
              onPress={() => setHideConferenceTimer(v => !v)}
            >{hideConferenceTimer ? 'ON' : 'OFF'}</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>hideConferenceSubject(隐藏主题)</Text>
            <Text
              style={[styles.switchBtn, hideConferenceSubject ? styles.switchOn : styles.switchOff]}
              onPress={() => setHideConferenceSubject(v => !v)}
            >{hideConferenceSubject ? 'ON' : 'OFF'}</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>prejoinPageEnabled(启用加入前页)</Text>
            <Text
              style={[styles.switchBtn, prejoinPageEnabled ? styles.switchOn : styles.switchOff]}
              onPress={() => setPrejoinPageEnabled(v => !v)}
            >{prejoinPageEnabled ? 'ON' : 'OFF'}</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>prejoinConfig.hideDisplayName(隐藏显示名输入)</Text>
            <Text
              style={[styles.switchBtn, hideDisplayName ? styles.switchOn : styles.switchOff]}
              onPress={() => setHideDisplayName(v => !v)}
            >{hideDisplayName ? 'ON' : 'OFF'}</Text>
          </View>

          {/* 应用 / 恢复 */}
          <View style={styles.btnRow}>
            <Btn title="应用并重进" color="#1a7" onPress={applyAndRemount} />
            <Btn title="恢复默认" color="#888" onPress={resetAll} />
          </View>
          <Text style={styles.muted}>
            当前 flags 共 {Object.keys(flagsProp).length} 项,toolbarButtons {toolbarSelected.length} 个。
          </Text>

          {/* ============ AppInfo ============ */}
          <Section title="AppInfo" hint="getConstants():name/version/buildNumber 取自 bundleInfo,其余默认空串/false。" />
          <View style={styles.btnRow}>
            <Btn title="getConstants()" onPress={() => showConstants('AppInfo.getConstants()', AppInfo?.getConstants?.())} />
          </View>

          {/* ============ AudioMode ============ */}
          <Section title="AudioMode" hint="常量 DEFAULT=0/AUDIO_CALL=1/VIDEO_CALL=2;setMode 非法值 reject;setDisabled/setMode 为 Promise。" />
          <View style={styles.btnRow}>
            <Btn title="getConstants()" onPress={() => showConstants('AudioMode.getConstants()', AudioMode?.getConstants?.())} />
            <Btn title="setMode(DEFAULT)" onPress={() => run('AudioMode.setMode(0)', () => AudioMode?.setMode?.(0))} />
            <Btn title="setMode(AUDIO_CALL)" onPress={() => run('AudioMode.setMode(1)', () => AudioMode?.setMode?.(1))} />
            <Btn title="setMode(VIDEO_CALL)" onPress={() => run('AudioMode.setMode(2)', () => AudioMode?.setMode?.(2))} />
            <Btn title="setMode(99)非法" color="#d33" onPress={() => run('AudioMode.setMode(99)', () => AudioMode?.setMode?.(99))} />
            <Btn title="setDisabled(true)" onPress={() => run('AudioMode.setDisabled(true)', () => AudioMode?.setDisabled?.(true))} />
            <Btn title="setDisabled(false)" onPress={() => run('AudioMode.setDisabled(false)', () => AudioMode?.setDisabled?.(false))} />
            <Btn title="setAudioDevice(SPEAKER)" onPress={() => run('AudioMode.setAudioDevice("SPEAKER")', () => AudioMode?.setAudioDevice?.('SPEAKER'))} />
            <Btn title="setUseConnectionService(true)" onPress={() => run('AudioMode.setUseConnectionService(true)', () => AudioMode?.setUseConnectionService?.(true))} />
            <Btn title="addListener/removeListeners" onPress={() => { AudioMode?.addListener?.('test'); AudioMode?.removeListeners?.(1); appendLog('▶ AudioMode addListener/removeListeners (no-op)'); }} />
          </View>
          <Text style={styles.muted}>已自动订阅 DEVICE_CHANGE_EVENT,设备变更会在日志中以 [AudioMode 事件] 出现。</Text>

          {/* ============ ExternalAPI ============ */}
          <Section title="ExternalAPI" hint="getConstants() 返回 17 个 BroadcastAction 动作字符串;sendEvent(name,data) 同步下发。" />
          <View style={styles.btnRow}>
            <Btn title="getConstants()·17动作" onPress={() => showConstants('ExternalAPI.getConstants()', ExternalAPI?.getConstants?.())} />
            <Btn title="sendEvent(hang-up,{})" onPress={() => run('ExternalAPI.sendEvent("hang-up",{})', () => ExternalAPI?.sendEvent?.('hang-up', {}))} />
            <Btn title="sendEvent(open-chat,{})" onPress={() => run('ExternalAPI.sendEvent("open-chat",{})', () => ExternalAPI?.sendEvent?.('open-chat', {}))} />
            <Btn title="sendEvent(start-recording,{})" onPress={() => run('ExternalAPI.sendEvent("start-recording",{})', () => ExternalAPI?.sendEvent?.('start-recording', {}))} />
            <Btn title="addListener/removeListeners" onPress={() => { ExternalAPI?.addListener?.('test'); ExternalAPI?.removeListeners?.(1); appendLog('▶ ExternalAPI addListener/removeListeners (no-op)'); }} />
          </View>

          {/* ============ 权限跳转测试 ============ */}
          <Section title="权限跳转(harmony)" hint="验证 permissions/functions.ts 的 case 'harmony' 分支:Linking.openSettings() 跳系统应用权限页。" />
          <View style={styles.btnRow}>
            <Btn title="Linking.openSettings()" onPress={() => run('Linking.openSettings()', () => Linking.openSettings())} />
          </View>

          {/* ============ ConnectionService ============ */}
          <Section title="ConnectionService(桩)" hint="鸿蒙无 Telecom:startCall/reportConnectedOutgoingCall 直接 resolve,其余 no-op。" />
          <View style={styles.btnRow}>
            <Btn title="startCall(uuid,handle,false)" onPress={() => run('ConnectionService.startCall', () => ConnectionService?.startCall?.('uuid-1', 'meet@room', false))} />
            <Btn title="reportConnectedOutgoingCall(uuid)" onPress={() => run('ConnectionService.reportConnectedOutgoingCall', () => ConnectionService?.reportConnectedOutgoingCall?.('uuid-1'))} />
            <Btn title="endCall(uuid)" onPress={() => run('ConnectionService.endCall', () => ConnectionService?.endCall?.('uuid-1'))} />
            <Btn title="reportCallFailed(uuid)" onPress={() => run('ConnectionService.reportCallFailed', () => ConnectionService?.reportCallFailed?.('uuid-1'))} />
            <Btn title="updateCall(uuid,{state:1})" onPress={() => run('ConnectionService.updateCall', () => ConnectionService?.updateCall?.('uuid-1', { state: 1 }))} />
            <Btn title="addListener/removeListeners" onPress={() => { ConnectionService?.addListener?.('test'); ConnectionService?.removeListeners?.(1); appendLog('▶ ConnectionService addListener/removeListeners (no-op)'); }} />
          </View>

          {/* ============ LocaleDetector ============ */}
          <Section title="LocaleDetector" hint="getConstants().locale 取自系统语言(getSystemLanguage,BCP-47)。" />
          <View style={styles.btnRow}>
            <Btn title="getConstants()" onPress={() => showConstants('LocaleDetector.getConstants()', LocaleDetector?.getConstants?.())} />
          </View>

          {/* ============ LogBridge ============ */}
          <Section title="LogBridge" hint="6 级日志同步桥接到 hilog;log 等同 info。日志在原生 hilog 侧查看。" />
          <View style={styles.btnRow}>
            <Btn title="trace" onPress={() => run('LogBridge.trace', () => LogBridge?.trace?.('[demo] trace message'))} />
            <Btn title="debug" onPress={() => run('LogBridge.debug', () => LogBridge?.debug?.('[demo] debug message'))} />
            <Btn title="info" onPress={() => run('LogBridge.info', () => LogBridge?.info?.('[demo] info message'))} />
            <Btn title="log" onPress={() => run('LogBridge.log', () => LogBridge?.log?.('[demo] log message'))} />
            <Btn title="warn" onPress={() => run('LogBridge.warn', () => LogBridge?.warn?.('[demo] warn message'))} />
            <Btn title="error" onPress={() => run('LogBridge.error', () => LogBridge?.error?.('[demo] error message'))} />
          </View>

          {/* ============ PictureInPicture ============ */}
          <Section title="PictureInPicture" hint="SUPPORTED 取 PiPWindow.isPiPEnabled;enterPictureInPicture 未启用时 resolve,无视频源时 reject。" />
          <View style={styles.btnRow}>
            <Btn title="getConstants()" onPress={() => showConstants('PictureInPicture.getConstants()', PictureInPicture?.getConstants?.())} />
            <Btn title="setPictureInPictureEnabled(true)" onPress={() => run('PictureInPicture.setPictureInPictureEnabled(true)', () => PictureInPicture?.setPictureInPictureEnabled?.(true))} />
            <Btn title="setPictureInPictureEnabled(false)" onPress={() => run('PictureInPicture.setPictureInPictureEnabled(false)', () => PictureInPicture?.setPictureInPictureEnabled?.(false))} />
            <Btn title="enterPictureInPicture()" color="#d33" onPress={() => run('PictureInPicture.enterPictureInPicture()', () => PictureInPicture?.enterPictureInPicture?.())} />
          </View>

          {/* ============ Proximity ============ */}
          <Section title="Proximity(桩)" hint="setEnabled(enabled) 同步记录状态,鸿蒙通话息屏由系统接管。" />
          <View style={styles.btnRow}>
            <Btn title="setEnabled(true)" onPress={() => run('Proximity.setEnabled(true)', () => Proximity?.setEnabled?.(true))} />
            <Btn title="setEnabled(false)" onPress={() => run('Proximity.setEnabled(false)', () => Proximity?.setEnabled?.(false))} />
          </View>

          {/* ============ 日志 ============ */}
          <Section title="事件日志" />
          {log.length === 0 ? (
            <Text style={styles.muted}>暂无事件,点击上方按钮触发接口调用。</Text>
          ) : (
            log.map((line, i) => (
              <Text key={i} style={styles.log}>{line}</Text>
            ))
          )}
          <View style={styles.btnRow}>
            <Btn title="清空日志" color="#888" onPress={() => setLog([])} />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 根容器:整屏。背景黑(JitsiMeeting 加载瞬间可见)。
  root: { flex: 1, backgroundColor: '#000', paddingBottom: 20 },
  // JitsiMeeting 铺满背景层。
  // 鸿蒙上 jitsi 的 Toolbox.tsx 只对 iOS 启用底部 SafeArea(edges 含 'bottom'),
  // 鸿蒙 edges=[] → 工具栏贴屏幕底,被手势条遮挡。这里给 meeting 留出底部安全区,
  // 让 jitsi 视图(含底部工具栏)整体上抬到手势条上方。bottomGap 在 InnerDemo 中由
  // useSafeAreaInsets 计算后内联注入(见渲染处),故此处不写死。
  meeting: { flex: 1 },

  // 悬浮入口按钮(左侧垂直居中)。
  fab: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -22 }],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // 抽屉遮罩。
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000'
  },

  // 抽屉容器。
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  drawerHeader: { paddingTop: 10, paddingHorizontal: 16 },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 10
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f2f2f2',
    borderRadius: 12
  },
  closeText: { fontSize: 13, color: '#333' },
  drawerScroll: { flex: 1 },
  drawerContent: { padding: 16, paddingTop: 4 },

  // 通用排版(沿用原 demo 风格)。
  h1: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  section: { marginTop: 18 },
  h2: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  label: { fontSize: 13, color: '#555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#000',
    marginBottom: 8
  },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  btn: { marginVertical: 4, marginRight: 6 },
  muted: { fontSize: 12, color: '#999', marginVertical: 2 },
  log: { fontSize: 12, color: '#444', paddingVertical: 1, fontFamily: 'monospace' },

  // ===== flags / config 配置区块 =====
  subGroup: { marginTop: 10, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fafafa', borderRadius: 6 },
  h3: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  toggleLabel: { fontSize: 13, color: '#333', flex: 1, marginRight: 8 },
  toggleNote: { fontSize: 11, color: '#e65' },
  switchBtn: { fontSize: 12, fontWeight: '700', color: '#fff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  switchOn: { backgroundColor: '#1a7' },
  switchOff: { backgroundColor: '#bbb' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  chip: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, overflow: 'hidden', color: '#fff' },
  chipOn: { backgroundColor: '#16a' },
  chipOff: { backgroundColor: '#ccd', color: '#445' },
  smallInput: { width: 90, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, color: '#000', fontSize: 13 }
});

export default JitsiMeetingDemo;
