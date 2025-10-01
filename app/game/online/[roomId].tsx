import React from 'react';
import { View, ScrollView, useWindowDimensions, Platform, useColorScheme, Share, Alert, Pressable, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { toast } from '@/ui/toast';
import HeaderIndicators from '@/features/online/HeaderIndicators';
import { themes, ThemeName } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { ReconnectListener } from '@/features/online/reconnect';
import RoomChat from '@/features/chat/RoomChat';
import { useCommentarySettings, CommentaryStrip, createCommentarySession, resolvePersona } from '@/features/commentary';
// import { DevOverlay } from '@/ui/DevOverlay';
import { useRoomStore } from '@/features/online/room.store';
import { buildInvite } from '@/features/online/invite';
import { useRoomScreenState } from '@/features/online/room-screen/useRoomScreen';
import { RoomHeader } from '@/features/online/room-screen/RoomHeader';
import { SeatControls } from '@/features/online/room-screen/SeatControls';
import { RoomBoard } from '@/features/online/room-screen/RoomBoard';
import type { BoardStatus } from '@/features/chess/components/board/BoardCore';
import { RoomActions } from '@/features/online/room-screen/RoomActions';
import { RoomToasts } from '@/features/online/room-screen/RoomToasts';
import type { Seat } from '@/net/types';
import { useReview } from '@/features/view/review.store';
import { Ionicons } from '@expo/vector-icons';
import { AnimRegistryProvider } from '@/features/chess/animation/AnimRegistry';
function BottomBar({ room, mySide, onUndo, onOfferDraw, onResign, onGoLive, bottomInset, iconColor, mode, onFlip, soundsEnabled, toggleSounds, hapticsEnabled, toggleHaptics, boardTheme, onSelectBoardTheme, onOpenSettings }: { room?: any; mySide: 'w'|'b'|null; onUndo: () => void; onOfferDraw: () => void; onResign: () => void; onGoLive: () => void; bottomInset: number; iconColor: string; mode: ThemeName; onFlip: () => void; soundsEnabled: boolean; toggleSounds: () => void; hapticsEnabled: boolean; toggleHaptics: () => void; boardTheme: 'default'|'classicGreen'|'native'; onSelectBoardTheme: (t: 'default'|'classicGreen'|'native') => void; onOpenSettings: () => void }) {
  const { plyIndex, setPlyIndex } = useReview();
  const livePlies = room?.historySAN?.length || 0;
  const reviewing = plyIndex < livePlies;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const ripple = mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const iconBg = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const iconBorder = mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  const IconButton = ({ name, onPress, accessibilityLabel, disabled = false, onDisabledPress }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; accessibilityLabel: string; disabled?: boolean; onDisabledPress?: () => void }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        if (disabled) {
          onDisabledPress?.();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      android_ripple={{ color: ripple, borderless: true }}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'ios' ? 'transparent' : iconBg, borderWidth: Platform.OS === 'ios' ? 0 : 1, borderColor: Platform.OS === 'ios' ? 'transparent' : iconBorder, opacity: disabled ? 0.6 : 1 }}
    >
      <Ionicons name={name as any} size={26} color={disabled ? (themes[mode].muted as string) : iconColor} />
    </Pressable>
  );

  const Row = ({ children, onPress, danger, disabled = false, onDisabledPress }: { children: React.ReactNode; onPress: () => void; danger?: boolean; disabled?: boolean; onDisabledPress?: () => void }) => (
    <Pressable
      onPress={() => {
        if (disabled) {
          onDisabledPress?.();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      accessibilityRole="button"
      android_ripple={{ color: danger ? 'rgba(255,59,48,0.18)' : ripple }}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12, opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </Pressable>
  );

  const [themesOpen, setThemesOpen] = React.useState(false);

  const MenuList = ({ mode, iconColor, onOfferDraw, onResign, onFlip, soundsEnabled, toggleSounds, hapticsEnabled, toggleHaptics, openThemes, onOpenSettings }: { mode: ThemeName; iconColor: string; onOfferDraw: () => void; onResign: () => void; onFlip: () => void; soundsEnabled: boolean; toggleSounds: () => void; hapticsEnabled: boolean; toggleHaptics: () => void; openThemes: () => void; onOpenSettings: () => void }) => {
    const canOfferDraw = Boolean(room && room.phase === 'ACTIVE' && !room.result && !room.pending?.drawFrom && mySide);
    const canResign = Boolean(room && room.phase === 'ACTIVE' && !room.result && mySide);
    const canRematch = Boolean(room && room.result && !room.pending?.restartFrom);
    const onOfferDrawDisabled = () => {
      if (room?.result) return toast('Game finished. Cannot offer draw.');
      if (!mySide) return toast('Sit down to offer a draw.');
      if (room?.pending?.drawFrom) return toast('Draw offer already pending.');
      return toast('Unavailable right now.');
    };
    const onResignDisabled = () => {
      if (room?.result) return toast('Game finished. Resign unavailable.');
      if (!mySide) return toast('Sit down to resign.');
      return toast('Unavailable right now.');
    };
    const onRematchDisabled = () => toast('Rematch already requested.');
    return (
      <View style={{ borderRadius: 18, overflow: 'hidden' }}>
        {/* Rematch at top when finished */}
        {room?.result && (
          <>
            <Row onPress={() => { (useRoomStore.getState().net as any)?.restart?.(); }} disabled={!canRematch} onDisabledPress={onRematchDisabled}>
              <Ionicons name="refresh" size={22} color={iconColor} />
              <Text style={{ fontSize: 16 }}>Rematch</Text>
            </Row>
            <View style={{ height: 6, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
          </>
        )}
        {/* Top: Offer Draw, Resign */}
        <Row onPress={onOfferDraw} disabled={!canOfferDraw} onDisabledPress={onOfferDrawDisabled}>
          <Ionicons name="hand-left-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Offer Draw</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
        <Row onPress={onResign} danger disabled={!canResign} onDisabledPress={onResignDisabled}>
          <Ionicons name="flag-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16, color: Platform.OS === 'ios' ? '#FF3B30' : '#FF453A' }}>Resign</Text>
        </Row>
        <View style={{ height: 6, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
        {/* Below: Flip, Sounds, Haptics, Board Themes, Settings */}
        <Row onPress={onFlip}>
          <Ionicons name="swap-vertical" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Flip Board</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
        <Row onPress={toggleSounds}>
          <Ionicons name={soundsEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>{soundsEnabled ? 'Disable Sounds' : 'Enable Sounds'}</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
        <Row onPress={toggleHaptics}>
          <Ionicons name={hapticsEnabled ? 'phone-portrait-outline' : 'phone-portrait'} size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>{hapticsEnabled ? 'Disable Haptics' : 'Enable Haptics'}</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
        <Row onPress={openThemes}>
          <Ionicons name="color-palette-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Board Themes</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
        <Row onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Settings</Text>
        </Row>
      </View>
    );
  };

  const ThemesList = ({ mode, iconColor, selected, onSelect, onBack }: { mode: ThemeName; iconColor: string; selected: 'default'|'classicGreen'|'native'; onSelect: (t: 'default'|'classicGreen'|'native') => void; onBack: () => void }) => (
    <View style={{ borderRadius: 18, overflow: 'hidden' }}>
      {/* Header title */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Board Themes</Text>
      </View>
      <View style={{ height: 6, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
      {(['default','classicGreen','native'] as const).map((t, idx) => (
        <React.Fragment key={t}>
          <Row onPress={() => onSelect(t)}>
            <Ionicons name={t === 'default' ? 'grid-outline' : t === 'classicGreen' ? 'leaf-outline' : 'color-filter-outline'} size={22} color={iconColor} />
            <Text style={{ fontSize: 16 }}>{t === 'default' ? 'Default' : t === 'classicGreen' ? 'Classic Green' : 'Native'}</Text>
            <View style={{ flex: 1 }} />
            {selected === t && <Ionicons name="checkmark" size={20} color={iconColor} />}
          </Row>
          {idx < 2 && <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />}
        </React.Fragment>
      ))}
      <View style={{ height: 6, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#D1D1D6' }} />
      {/* Back at bottom */}
      <Row onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color={iconColor} />
        <Text style={{ fontSize: 16 }}>Back</Text>
      </Row>
    </View>
  );

  const Content = (
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Menu */}
      <IconButton name="ellipsis-horizontal" accessibilityLabel="Menu" onPress={() => { setThemesOpen(false); setMenuOpen(true); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
      {/* Undo */}
      {!room?.result ? (
        <IconButton
          name="arrow-undo"
          accessibilityLabel="Undo"
          onPress={onUndo}
          disabled={(() => {
            const rated = !!room?.rated;
            const live = room?.mode === '1v1';
            const allow = room?.phase === 'ACTIVE' ? !!room?.policies?.allowTakebacks : !!room?.options?.allowTakebacks;
            if (live && rated) return true;
            if (live && !allow) return true;
            return false;
          })()}
          onDisabledPress={() => {
            const rated = !!room?.rated;
            if (rated) return toast("Takebacks aren’t available in rated games.");
            return toast('Takebacks are disabled for this game.');
          }}
        />
      ) : <View style={{ width: 40, height: 40 }} />}
      {/* Back/Forward group */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
        <IconButton name="chevron-back" accessibilityLabel="Back move" onPress={() => setPlyIndex(Math.max(0, plyIndex - 1), livePlies)} />
        <IconButton name="chevron-forward" accessibilityLabel="Forward move" onPress={() => { if (plyIndex + 1 >= livePlies) onGoLive(); else setPlyIndex(plyIndex + 1, livePlies); }} />
      </View>
    </View>
  );

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: bottomInset, paddingTop: 8 }}>
      {/* Menu overlay */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => { setMenuOpen(false); }}>
        <View style={{ flex: 1 }}>
          {/* Background closer */}
          <Pressable onPress={() => { setMenuOpen(false); }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }} />
          {/* Sheet */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={60} tint={mode} style={{ marginHorizontal: 12, marginBottom: bottomInset + 80, borderRadius: 18, overflow: 'hidden', backgroundColor: mode === 'dark' ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.7)' }}>
                {themesOpen ? (
                  <ThemesList
                    mode={mode}
                    iconColor={iconColor}
                    selected={boardTheme}
                    onSelect={(t) => { onSelectBoardTheme(t); setThemesOpen(false); /* stay in menu */ }}
                    onBack={() => setThemesOpen(false)}
                  />
                ) : (
                  <MenuList
                    mode={mode}
                    iconColor={iconColor}
                    onOfferDraw={() => { setMenuOpen(false); onOfferDraw(); }}
                    onResign={() => { setMenuOpen(false); onResign(); }}
                    onFlip={() => { setMenuOpen(false); onFlip(); }}
                    soundsEnabled={soundsEnabled}
                    toggleSounds={() => { setMenuOpen(false); toggleSounds(); }}
                    hapticsEnabled={hapticsEnabled}
                    toggleHaptics={() => { setMenuOpen(false); toggleHaptics(); }}
                    openThemes={() => setThemesOpen(true)}
                    onOpenSettings={() => { setMenuOpen(false); onOpenSettings(); }}
                  />
                )}
              </BlurView>
            ) : (
              <View style={{ marginHorizontal: 12, marginBottom: bottomInset + 80, borderRadius: 18, backgroundColor: themes[mode].card, elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
                {themesOpen ? (
                  <ThemesList
                    mode={mode}
                    iconColor={iconColor}
                    selected={boardTheme}
                    onSelect={(t) => { onSelectBoardTheme(t); setThemesOpen(false); /* stay in menu */ }}
                    onBack={() => setThemesOpen(false)}
                  />
                ) : (
                  <MenuList
                    mode={mode}
                    iconColor={iconColor}
                    onOfferDraw={() => { setMenuOpen(false); onOfferDraw(); }}
                    onResign={() => { setMenuOpen(false); onResign(); }}
                    onFlip={() => { setMenuOpen(false); onFlip(); }}
                    soundsEnabled={soundsEnabled}
                    toggleSounds={() => { setMenuOpen(false); toggleSounds(); }}
                    hapticsEnabled={hapticsEnabled}
                    toggleHaptics={() => { setMenuOpen(false); toggleHaptics(); }}
                    openThemes={() => setThemesOpen(true)}
                    onOpenSettings={() => { setMenuOpen(false); onOpenSettings(); }}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint={mode} style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 22, overflow: 'hidden', backgroundColor: mode === 'dark' ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.7)' }}>
          {Content}
        </BlurView>
      ) : (
        <View style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 22, backgroundColor: themes[mode].card, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
          {Content}
        </View>
      )}
    </View>
  );
}

export default function OnlineRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { room, meId, mySeats, mySide, isHost, readyToStart, isMyTurn, isMinimal, nameById } = useRoomScreenState();
  const commentary = useCommentarySettings();

  const moveSAN = useRoomStore((state) => state.moveSAN);
  const passBaton = useRoomStore((state) => state.passBaton);
  const start = useRoomStore((state) => state.start);
  const leave = useRoomStore((state) => state.leave);
  const resign = useRoomStore((state) => state.resign);
  const offerDraw = useRoomStore((state) => state.offerDraw);
  const requestUndo = useRoomStore((state) => state.requestUndo);
  const answerDraw = useRoomStore((state) => state.answerDraw);

  const { width } = useWindowDimensions();
  const fullEdge = useSettings((state) => state.fullEdgeBoard);
  const themeSetting = useSettings((state) => state.theme);
  const scheme = useColorScheme();
  const activeTheme: ThemeName = (themeSetting === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : themeSetting) as ThemeName;
  const containerPad = fullEdge ? 0 : 12;
  const inset = fullEdge ? 0 : containerPad * 2;
  const boardSize = Math.floor(width - inset);
  const insets = useSafeAreaInsets();
  const bottomBarHeight = 64 + insets.bottom;
  // Do not modify tab visibility here; FloatingTabBar handles non-root screens

  const [copied, setCopied] = React.useState(false);
  const [archiveToast, setArchiveToast] = React.useState<string | null>(null);
  const [leftToast, setLeftToast] = React.useState<string | null>(null);
  const [joinToast, setJoinToast] = React.useState<string | null>(null);
  const [boardStatus, setBoardStatus] = React.useState<BoardStatus | null>(null);
  const handleBoardStatusChange = React.useCallback((next: BoardStatus | null) => {
    setBoardStatus((prev) => {
      if (prev?.key === next?.key) return prev;
      return next ?? null;
    });
  }, []);
  const mountAtRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    return () => {
      try {
        leave();
      } catch {}
    };
  }, [leave]);

  const prevMemberIdsRef = React.useRef<string[]>([]);
  const hasBaselineRef = React.useRef<boolean>(false);
  React.useEffect(() => {
    const members = room?.members ?? [];
    if (!room) return;
    const currentOpponents = members.filter((member) => member.id !== meId).map((member) => member.id);
    const previousOpponents = prevMemberIdsRef.current.filter((id) => id !== meId);

    if (!hasBaselineRef.current) {
      prevMemberIdsRef.current = members.map((member) => member.id);
      hasBaselineRef.current = true;
      return;
    }

    if (previousOpponents.length === 0 && currentOpponents.length >= 1 && Date.now() - mountAtRef.current > 1500) {
      setJoinToast('Opponent joined');
    }

    if (previousOpponents.length >= 1 && currentOpponents.length === 0 && Date.now() - mountAtRef.current > 1500) {
      setLeftToast('Opponent left the room');
    }

    prevMemberIdsRef.current = members.map((member) => member.id);
  }, [room, meId]);

  React.useEffect(() => {
    if (!joinToast) return;
    const timeout = setTimeout(() => setJoinToast(null), 1500);
    return () => clearTimeout(timeout);
  }, [joinToast]);

  React.useEffect(() => {
    if (!leftToast) return;
    const timeout = setTimeout(() => setLeftToast(null), 2000);
    return () => clearTimeout(timeout);
  }, [leftToast]);

  React.useEffect(() => {
    if (!boardStatus) return;
    logMove('board status', { key: boardStatus.key, kind: boardStatus.kind });
  }, [boardStatus]);

  const prevResultRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const result = room?.result;
    if (result && prevResultRef.current !== result) {
      setArchiveToast('Saved to Archive');
      const timeout = setTimeout(() => setArchiveToast(null), 1400);
      return () => clearTimeout(timeout);
    }
    prevResultRef.current = result;
  }, [room?.result]);

  const handleInvite = React.useCallback(async () => {
    if (!room) return;
    try {
      await Share.share({ message: buildInvite(room.roomId) });
    } catch {}
  }, [room]);

  const handleCopyId = React.useCallback(async () => {
    if (!room) return;
    try {
      await Clipboard.setStringAsync(room.roomId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [room]);

  const handleLeave = React.useCallback(() => {
    leave();
    router.replace('/game/online');
  }, [leave, router]);

  const handleSeatSide = React.useCallback((side: 'w' | 'b') => {
    const net = useRoomStore.getState().net as any;
    net.seatSide?.(side);
  }, []);

  const handleReleaseSeat = React.useCallback(() => {
    const net = useRoomStore.getState().net as any;
    net.releaseSeat?.();
  }, []);

  const handleAnswerUndo = React.useCallback((accept: boolean) => {
    const net = useRoomStore.getState().net as any;
    net.answerUndo?.(accept);
  }, []);

  const handleAnswerRestart = React.useCallback((accept: boolean) => {
    const net = useRoomStore.getState().net as any;
    net.answerRestart?.(accept);
  }, []);

  const handleRestart = React.useCallback(() => {
    const net = useRoomStore.getState().net as any;
    net.restart?.();
  }, []);

  const handlers = React.useMemo(
    () => ({
      onStart: start,
      onLeave: handleLeave,
      onResign: resign,
      onOfferDraw: offerDraw,
      onUndoRequest: requestUndo,
      onPassBaton: passBaton,
      onRestart: handleRestart,
      onAnswerDraw: answerDraw,
      onAnswerUndo: handleAnswerUndo,
      onAnswerRestart: handleAnswerRestart,
    }),
    [start, handleLeave, resign, offerDraw, requestUndo, passBaton, handleRestart, answerDraw, handleAnswerUndo, handleAnswerRestart]
  );

  // Local UI flags for menu toggles
  const soundsEnabled = useSettings((s) => s.sounds);
  const setSounds = useSettings((s) => s.setSounds);
  const hapticsEnabled = useSettings((s) => s.haptics);
  const setHaptics = useSettings((s) => s.setHaptics);
  const [flip, setFlip] = React.useState<'w'|'b' | null>(null);

  const onFlip = React.useCallback(() => {
    setFlip((prev) => (prev === 'w' ? 'b' : prev === 'b' ? 'w' : (mySide === 'w' ? 'b' : 'w')));
  }, [mySide]);

  const onShareGame = React.useCallback(async () => {
    if (!room) return;
    try {
      const { buildPGN } = await import('@/archive/pgn');
      const pgn = buildPGN({
        whiteName: room.whiteName,
        blackName: room.blackName,
        result: (room.result as any) || '*',
        movesSAN: room.historySAN,
        date: new Date(room.createdAt || Date.now()),
        event: 'Online Game',
        termination: (room as any).result_reason,
      });
      await Share.share({ message: pgn, title: `${room.whiteName} vs ${room.blackName}` });
    } catch {}
  }, [room]);

  const toggleSounds = React.useCallback(() => setSounds(!soundsEnabled), [setSounds, soundsEnabled]);
  const toggleHaptics = React.useCallback(() => setHaptics(!hapticsEnabled), [setHaptics, hapticsEnabled]);
  const boardTheme = useSettings((s) => s.boardTheme);
  const setBoardTheme = useSettings((s) => s.setBoardTheme);

  return (
    <AnimRegistryProvider>
    <Screen style={{ justifyContent: 'flex-start', paddingHorizontal: containerPad }}>
      <Stack.Screen options={{ headerTitle: 'Online Game', headerRight: () => <HeaderIndicators /> }} />
      <ScrollView
        style={{ flex: 1, alignSelf: 'stretch' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 48 + bottomBarHeight, paddingHorizontal: containerPad, paddingTop: 16 }}
        contentInsetAdjustmentBehavior="automatic"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        horizontal={false}
        alwaysBounceHorizontal={false}
        directionalLockEnabled
        overScrollMode="never"
        persistentScrollbar={false}
        fadingEdgeLength={0}
      >
        <ReconnectListener />

        {!room && (
          <>
            <Card style={{ marginBottom: 12 }}>
              <Text>{`Room ${roomId}`}</Text>
            </Card>
            <Text>Joining room.</Text>
          </>
        )}

        {room && (
          <>
            <RoomHeader
              room={room}
              mySide={mySide}
              isMyTurn={isMyTurn}
              meId={meId}
              copied={copied}
              onCopyId={handleCopyId}
              onInvite={handleInvite}
            />

            <SeatControls
              room={room}
              meId={meId}
              mySeats={mySeats as Seat[]}
              isMinimal={isMinimal}
              nameById={nameById}
              onSeatSide={handleSeatSide}
              onRelease={handleReleaseSeat}
            />

            <RoomChat />

            <RoomBoard room={room} mySide={mySide} boardSize={boardSize} meId={meId} moveSAN={moveSAN} orientation={flip ?? undefined} onStatusChange={handleBoardStatusChange} />

            <RoomActions
              room={room}
              mySide={mySide}
              meId={meId}
              isHost={isHost}
              readyToStart={readyToStart}
              handlers={handlers}
              showDevReset={false}
            />
          </>
        )}
      </ScrollView>

      {Platform.OS === 'android' && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: themes[activeTheme].background }} />
      )}

      <RoomToasts archiveToast={archiveToast} leftToast={leftToast} joinToast={joinToast} />

      {/* Bottom action bar */}
      <BottomBar
        room={room}
        mySide={mySide}
        onUndo={handlers.onUndoRequest}
        onOfferDraw={handlers.onOfferDraw}
        onResign={handlers.onResign}
        onGoLive={() => useReview.getState().goLive(room?.historySAN.length || 0)}
        bottomInset={insets.bottom}
        iconColor={themes[activeTheme].text as string}
        mode={activeTheme}
        onFlip={onFlip}
        soundsEnabled={soundsEnabled}
        toggleSounds={toggleSounds}
        hapticsEnabled={hapticsEnabled}
        toggleHaptics={toggleHaptics}
        boardTheme={boardTheme}
        onSelectBoardTheme={(t) => setBoardTheme(t as any)}
        onOpenSettings={() => router.push({ pathname: '/(tabs)/profile/settings', params: { from: 'game', roomId: String(room?.roomId || roomId), returnTo: `/game/online/${String(room?.roomId || roomId)}` } })}
      />
    </Screen>
  </AnimRegistryProvider>
  );
}

