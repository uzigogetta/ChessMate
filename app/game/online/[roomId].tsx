import React from 'react';
import { View, ScrollView, Animated, Easing, useWindowDimensions, Platform, Alert } from 'react-native';
import { colors } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';
import * as Haptics from 'expo-haptics';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { useRoomStore } from '@/features/online/room.store';
import { Seat } from '@/net/types';
import { moveToSAN } from '@/features/chess/logic/chess.rules';
import { isLegalMoveForDriver, validateMove, getTurn } from '@/features/chess/logic/moveHelpers';
import { logMove } from '@/debug/netLogger';
import RoomChat from '@/features/chat/RoomChat';
import { ReconnectListener } from '@/features/online/reconnect';
import { DevOverlay } from '@/ui/DevOverlay';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { buildInvite } from '@/features/online/invite';
import PresenceBar from '@/features/online/PresenceBar';

function SeatButton({ label, seat, takenBy, onPress, disabled, nameById, meId }: { label: string; seat: Seat; takenBy?: string; onPress: () => void; disabled?: boolean; nameById: (id?: string) => string; meId: string }) {
  const occupant = takenBy ? ` • ${takenBy === meId ? 'you' : nameById(takenBy)}` : '';
  return <Button title={`${label}${occupant}`} onPress={onPress} disabled={disabled} />;
}

export default function OnlineRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const takeSeat = useRoomStore.getState().takeSeat;
  const passBaton = useRoomStore.getState().passBaton;
  const moveSAN = useRoomStore.getState().moveSAN;
  const leave = useRoomStore.getState().leave;
  const start = useRoomStore.getState().start;
  const resign = useRoomStore.getState().resign;
  const offerDraw = useRoomStore.getState().offerDraw;
  const mySeats: Seat[] = room ? (Object.keys(room.seats) as Seat[]).filter((k) => room.seats[k] === me.id) : [];
  const mySide: 'w' | 'b' | null = room ? (mySeats.some((s) => s.startsWith('w')) ? 'w' : mySeats.some((s) => s.startsWith('b')) ? 'b' : null) : null;
  const canMove = () => !!room && room.started && !!mySide && mySide === room.driver;
  const nameById = (id?: string) => (room?.members || []).find((m) => m.id === id)?.name || '—';
  const is1v1 = room?.mode === '1v1';
  const minimal = is1v1;
  const isMyTurn = !!room?.started && !!mySide && mySide === getTurn(room.fen);
  const readyToStart = room ? (is1v1 ? !!room.seats['w1'] && !!room.seats['b1'] : (!!room.seats['w1'] || !!room.seats['w2']) && (!!room.seats['b1'] || !!room.seats['b2'])) : false;
  const isHost = room && me && room.members.length > 0 ? me.id === [...room.members].sort((a,b)=>a.id.localeCompare(b.id))[0]?.id : false;
  const { width } = useWindowDimensions();
  const fullEdge = useSettings((s) => s.fullEdgeBoard);
  const containerPad = fullEdge ? 0 : 12;
  const inset = fullEdge ? 0 : containerPad * 2;
  const boardSize = Math.floor(width - inset);
  const [copied, setCopied] = React.useState(false);
  const [archiveToast, setArchiveToast] = React.useState<string | null>(null);

  // Show a one-shot toast when result is set (saved to archive)
  const prevResultRef = React.useRef<string | undefined>(undefined as any);
  React.useEffect(() => {
    const r = room?.result;
    if (r && prevResultRef.current !== r) {
      setArchiveToast('Saved to Archive');
      setTimeout(() => setArchiveToast(null), 1400);
    }
    prevResultRef.current = r as any;
  }, [room?.result]);
  const [flashSq, setFlashSq] = React.useState<string | null>(null);
  const shake = React.useRef(new Animated.Value(0)).current;
  const triggerFlash = React.useCallback((sq: string) => {
    setFlashSq(null);
    setTimeout(() => setFlashSq(sq), 0);
  }, []);
  const triggerShake = React.useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -6, duration: 40, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, easing: Easing.linear, useNativeDriver: true })
    ]).start();
  }, [shake]);
  return (
    <Screen style={{ justifyContent: 'flex-start', paddingHorizontal: containerPad }}>
      <ScrollView
        style={{ flex: 1, alignSelf: 'stretch' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 48, paddingHorizontal: containerPad }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
        bounces={false}
        alwaysBounceHorizontal={false}
        directionalLockEnabled
        overScrollMode="never"
        persistentScrollbar={false}
        fadingEdgeLength={0}
      >
        <ReconnectListener />
        <View style={{ position: 'absolute', top: 8, right: containerPad + 4, flexDirection: 'row', gap: 8 }}>
          <CloudUploadIndicator />
          <ConnectionIndicator />
        </View>
        {!room && (
          <>
            <Card style={{ marginBottom: 12 }}>
              <Text>{`Room ${roomId}`}</Text>
            </Card>
            <Text>Joining room…</Text>
          </>
        )}
        {!!room && (
          <>
            <Card style={{ marginBottom: 12 }}>
              <Text>{isMyTurn ? 'Your turn' : `${room.driver === 'w' ? 'White' : 'Black'} to move`}</Text>
              <Text muted>{`Room ${room.roomId} • You: ${mySide ? (mySide === 'w' ? 'White' : 'Black') : 'Spectator'} • ${room.members.length} players`}</Text>
              <PresenceBar members={room.members} seats={room.seats} myId={me.id} activeTeammate={null} mode={room.mode} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="Invite" onPress={async () => { await Share.share({ message: buildInvite(room.roomId) }); }} />
                <Button
                  title={copied ? 'Copied!' : 'Copy ID'}
                  disabled={copied}
                  variant={copied ? 'success' : 'primary'}
                  onPress={async () => {
                    await Clipboard.setStringAsync(room.roomId);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                />
              </View>
            </Card>
            <Card style={{ marginBottom: 12, gap: 8 }}>
              <Text>Members</Text>
              <View style={{ gap: 4 }}>
                {room.members.map((m) => (
                  <Text key={m.id} muted={m.id !== me.id}>{`${m.name}${m.id === me.id ? ' (you)' : ''}`}</Text>
                ))}
              </View>
            </Card>
            {!minimal && (
              <Card style={{ marginBottom: 12, gap: 8 }}>
                <Text>Seats</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button title="Join White" disabled={!!room.seats['w1'] && room.seats['w1'] !== me.id} onPress={() => (useRoomStore.getState().net as any).seatSide?.('w')} />
                  <Button title="Join Black" disabled={!!room.seats['b1'] && room.seats['b1'] !== me.id} onPress={() => (useRoomStore.getState().net as any).seatSide?.('b')} />
                  {mySeats.length > 0 && <Button title="Release Seat" onPress={() => (useRoomStore.getState().net as any).releaseSeat?.()} />}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {((room.mode === '1v1' ? ['w1', 'b1'] : ['w1', 'w2', 'b1', 'b2']) as Seat[]).map((s) => (
                    <SeatButton
                      key={s}
                      label={s}
                      seat={s}
                      takenBy={room.seats[s]}
                      nameById={nameById}
                      meId={me.id}
                      disabled
                      onPress={() => {}}
                    />
                  ))}
                </View>
              </Card>
            )}
            <RoomChat />
            <Animated.View style={{ transform: [{ translateX: shake }], alignSelf: 'center' }}>
              <BoardSkia
                fen={room.fen}
                orientation={mySide ?? 'w'}
                selectableColor={mySide ?? 'w'}
                flashSquare={flashSq}
                size={boardSize}
                onMove={(from, to) => {
                  const turn = getTurn(room.fen);
                  if (!room.started || !mySide || mySide !== turn) {
                    triggerFlash(from);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    triggerShake();
                    return;
                  }
                  const v = validateMove(room.fen, from, to);
                  if (v.ok && v.san) {
                    logMove('UI request', { san: v.san, from: mySide, fen: room.fen });
                    moveSAN(v.san);
                  } else {
                    triggerFlash(from);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    triggerShake();
                  }
                }}
                onOptimisticMove={(from, to, rollback) => {
                  if (!isLegalMoveForDriver(room, me.id, from, to)) {
                    triggerFlash(from);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    triggerShake();
                    return;
                  }
                  const v = validateMove(room.fen, from, to);
                  if (!v.ok || !v.san) {
                    triggerFlash(from);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    triggerShake();
                    return;
                  }
                  moveSAN(v.san);
                }}
              />
            </Animated.View>
            {room.result && (
              <Card style={{ marginTop: 12, gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 18 }}>
                  {room.result === '1-0' ? 'White wins' : room.result === '0-1' ? 'Black wins' : 'Draw'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    title="Rematch"
                    onPress={() =>
                      Alert.alert('Rematch?', 'Ask your opponent to start a new game.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Request', onPress: () => (useRoomStore.getState().net as any).restart?.() }
                      ])
                    }
                  />
                  <Button
                    title="Leave Game"
                    onPress={() => {
                      leave();
                      router.replace('/game/online');
                    }}
                  />
                </View>
              </Card>
            )}
            <Card style={{ marginTop: 12, gap: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {room.started && !room.result && (
                <Button
                  title="Undo"
                  onPress={() =>
                    Alert.alert('Request undo?', 'Ask your opponent to revert the last move.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Request', onPress: () => useRoomStore.getState().requestUndo() }
                    ])
                  }
                />
              )}
              {!room.result && (
                <Button
                  title="Resign"
                  onPress={() =>
                    Alert.alert('Resign game?', 'Your opponent will be declared the winner.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Resign', style: 'destructive', onPress: () => resign() }
                    ])
                  }
                />
              )}
              {!room.result && !room.pending && (
                <Button
                  title="Offer Draw"
                  onPress={() =>
                    Alert.alert('Offer a draw?', 'Your opponent can accept or decline.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Offer Draw', onPress: () => offerDraw() }
                    ])
                  }
                />
              )}
              {room.pending && room.pending.drawFrom && room.pending.drawFrom !== me.id && (
                <>
                  <Button
                    title="Accept Draw"
                    onPress={() =>
                      Alert.alert('Accept draw?', 'This will end the game as a draw.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Accept', onPress: () => { useRoomStore.getState().answerDraw(true); } }
                      ])
                    }
                  />
                  <Button
                    title="Decline"
                    onPress={() =>
                      Alert.alert('Decline draw?', 'The draw offer will be dismissed.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Decline', style: 'destructive', onPress: () => { useRoomStore.getState().answerDraw(false); } }
                      ])
                    }
                  />
                </>
              )}
              {room.pending && room.pending.undoFrom && room.pending.undoFrom !== me.id && (
                <>
                  <Button
                    title="Accept Undo"
                    onPress={() =>
                      Alert.alert('Accept undo?', 'This will revert the last move.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Accept', onPress: () => (useRoomStore.getState().net as any).answerUndo?.(true) }
                      ])
                    }
                  />
                  <Button
                    title="Decline Undo"
                    onPress={() =>
                      Alert.alert('Decline undo?', 'Undo request will be dismissed.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Decline', style: 'destructive', onPress: () => (useRoomStore.getState().net as any).answerUndo?.(false) }
                      ])
                    }
                  />
                </>
              )}
              {room.pending && room.pending.restartFrom && room.pending.restartFrom !== me.id && (
                <>
                  <Button
                    title="Accept New Game"
                    onPress={() =>
                      Alert.alert('Start new game?', 'Board will reset and a new game will start.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Start', onPress: () => (useRoomStore.getState().net as any).answerRestart?.(true) }
                      ])
                    }
                  />
                  <Button
                    title="Decline New Game"
                    onPress={() =>
                      Alert.alert('Decline new game?', 'Request will be dismissed.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Decline', style: 'destructive', onPress: () => (useRoomStore.getState().net as any).answerRestart?.(false) }
                      ])
                    }
                  />
                </>
              )}
              {__DEV__ && (
                <Button
                  title="Reset"
                  onPress={() =>
                    Alert.alert('Start a new game?', 'This will reset the board and start a new game.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Reset', style: 'destructive', onPress: () => (useRoomStore.getState().net as any).restart?.() }
                    ])
                  }
                />
              )}
              {room.mode === '2v2' && mySide === room.driver && <Button title="Pass Baton" onPress={() => passBaton()} />}
            </Card>
            {!room.started && !room.result && (
              <Button
                title={isHost ? 'Start Game' : 'Waiting for host…'}
                onPress={() => start()}
                disabled={!readyToStart || !isHost || room.phase === 'ACTIVE'}
              />
            )}
            <Button
              title="Leave Room"
              onPress={() => {
                leave();
                router.replace('/game/online');
              }}
            />
          </>
        )}
      </ScrollView>
      {Platform.OS === 'android' && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.background }} />
      )}
      {archiveToast && (
        <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
            <Text style={{ color: 'white' }}>{archiveToast}</Text>
          </View>
        </View>
      )}
      <DevOverlay />
    </Screen>
  );
}
