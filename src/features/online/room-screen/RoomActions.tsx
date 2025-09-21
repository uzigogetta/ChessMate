import React from 'react';
import { Alert, View } from 'react-native';
import { Card, Button, Text } from '@/ui/atoms';
import type { RoomState } from '@/net/types';

type Handlers = {
  onStart: () => void;
  onLeave: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onUndoRequest: () => void;
  onPassBaton: () => void;
  onRestart: () => void;
  onAnswerDraw: (accept: boolean) => void;
  onAnswerUndo: (accept: boolean) => void;
  onAnswerRestart: (accept: boolean) => void;
};

export type RoomActionsProps = {
  room: RoomState;
  mySide: 'w' | 'b' | null;
  meId: string;
  isHost: boolean;
  readyToStart: boolean;
  handlers: Handlers;
  showDevReset: boolean;
};

export function RoomActions({ room, mySide, meId, isHost, readyToStart, handlers, showDevReset }: RoomActionsProps) {
  return (
    <>
      <Card style={{ marginTop: 12, gap: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {room.started && !room.result && (
          <Button
            title="Undo"
            onPress={() =>
              Alert.alert('Request undo?', 'Ask your opponent to revert the last move.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Request', onPress: handlers.onUndoRequest }
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
                { text: 'Resign', style: 'destructive', onPress: handlers.onResign }
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
                { text: 'Offer Draw', onPress: handlers.onOfferDraw }
              ])
            }
          />
        )}
        {room.pending?.drawFrom && room.pending.drawFrom !== meId && (
          <>
            <Button
              title="Accept Draw"
              onPress={() =>
                Alert.alert('Accept draw?', 'This will end the game as a draw.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Accept', onPress: () => handlers.onAnswerDraw(true) }
                ])
              }
            />
            <Button
              title="Decline"
              onPress={() =>
                Alert.alert('Decline draw?', 'The draw offer will be dismissed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => handlers.onAnswerDraw(false) }
                ])
              }
            />
          </>
        )}
        {room.pending?.undoFrom && room.pending.undoFrom !== meId && (
          <>
            <Button
              title="Accept Undo"
              onPress={() =>
                Alert.alert('Accept undo?', 'This will revert the last move.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Accept', onPress: () => handlers.onAnswerUndo(true) }
                ])
              }
            />
            <Button
              title="Decline Undo"
              onPress={() =>
                Alert.alert('Decline undo?', 'Undo request will be dismissed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => handlers.onAnswerUndo(false) }
                ])
              }
            />
          </>
        )}
        {room.pending?.restartFrom && room.pending.restartFrom !== meId && (
          <>
            <Button
              title="Accept New Game"
              onPress={() =>
                Alert.alert('Start new game?', 'Board will reset and a new game will start.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start', onPress: () => handlers.onAnswerRestart(true) }
                ])
              }
            />
            <Button
              title="Decline New Game"
              onPress={() =>
                Alert.alert('Decline new game?', 'Request will be dismissed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => handlers.onAnswerRestart(false) }
                ])
              }
            />
          </>
        )}
        {showDevReset && (
          <Button
            title="Reset"
            onPress={() =>
              Alert.alert('Start a new game?', 'This will reset the board and start a new game.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: handlers.onRestart }
              ])
            }
          />
        )}
        {room.mode === '2v2' && mySide === room.driver && <Button title="Pass Baton" onPress={handlers.onPassBaton} />}
      </Card>

      {!room.started && !room.result && (
        <Button
          title={isHost ? 'Start Game' : 'Waiting for host…'}
          onPress={handlers.onStart}
          disabled={!readyToStart || !isHost || room.phase === 'ACTIVE'}
        />
      )}

      <Button title="Leave Room" onPress={handlers.onLeave} />

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
                  { text: 'Request', onPress: handlers.onRestart }
                ])
              }
            />
            <Button title="Leave Game" onPress={handlers.onLeave} />
          </View>
        </Card>
      )}
    </>
  );
}
