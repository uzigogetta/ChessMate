import React from 'react';
import { View, ScrollView, useWindowDimensions, Platform, useColorScheme, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import HeaderIndicators from '@/features/online/HeaderIndicators';
import { themes, ThemeName } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { Screen, Card, Text } from '@/ui/atoms';
import { ReconnectListener } from '@/features/online/reconnect';
import RoomChat from '@/features/chat/RoomChat';
import { DevOverlay } from '@/ui/DevOverlay';
import { useRoomStore } from '@/features/online/room.store';
import { buildInvite } from '@/features/online/invite';
import { useRoomScreenState } from '@/features/online/room-screen/useRoomScreen';
import { RoomHeader } from '@/features/online/room-screen/RoomHeader';
import { SeatControls } from '@/features/online/room-screen/SeatControls';
import { RoomBoard } from '@/features/online/room-screen/RoomBoard';
import { RoomActions } from '@/features/online/room-screen/RoomActions';
import { RoomToasts } from '@/features/online/room-screen/RoomToasts';
import type { Seat } from '@/net/types';

export default function OnlineRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { room, meId, mySeats, mySide, isHost, readyToStart, isMyTurn, isMinimal, nameById } = useRoomScreenState();

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

  const [copied, setCopied] = React.useState(false);
  const [archiveToast, setArchiveToast] = React.useState<string | null>(null);
  const [leftToast, setLeftToast] = React.useState<string | null>(null);
  const [joinToast, setJoinToast] = React.useState<string | null>(null);
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

  return (
    <Screen style={{ justifyContent: 'flex-start', paddingHorizontal: containerPad }}>
      <Stack.Screen options={{ headerTitle: 'Online Game', headerRight: () => <HeaderIndicators /> }} />
      <ScrollView
        style={{ flex: 1, alignSelf: 'stretch' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 48, paddingHorizontal: containerPad, paddingTop: 16 }}
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

            <RoomBoard room={room} mySide={mySide} boardSize={boardSize} meId={meId} moveSAN={moveSAN} />

            <RoomActions
              room={room}
              mySide={mySide}
              meId={meId}
              isHost={isHost}
              readyToStart={readyToStart}
              handlers={handlers}
              showDevReset={__DEV__}
            />
          </>
        )}
      </ScrollView>

      {Platform.OS === 'android' && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: themes[activeTheme].background }} />
      )}

      <RoomToasts archiveToast={archiveToast} leftToast={leftToast} joinToast={joinToast} />
      <DevOverlay />
    </Screen>
  );
}


