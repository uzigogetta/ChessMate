import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoomHeader } from '@/features/online/room-screen/RoomHeader';
import type { RoomState } from '@/net/types';

const baseRoom: RoomState = {
  roomId: 'alpha',
  mode: '1v1',
  members: [
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
  ],
  seats: { w1: 'a', b1: 'b' },
  driver: 'w',
  fen: 'start',
  historySAN: [],
  started: true,
};

describe('RoomHeader', () => {
  it('renders turn and players', () => {
    const { getByText } = render(
      <RoomHeader
        room={baseRoom}
        mySide="w"
        isMyTurn
        meId="a"
        copied={false}
        onCopyId={() => {}}
        onInvite={() => {}}
      />
    );

    expect(getByText('Your turn')).toBeTruthy();
    expect(getByText('Room alpha • You: White • 2 players')).toBeTruthy();
  });

  it('invokes callbacks', () => {
    const handleCopy = jest.fn();
    const handleInvite = jest.fn();

    const { getByText } = render(
      <RoomHeader
        room={baseRoom}
        mySide={null}
        isMyTurn={false}
        meId="a"
        copied={false}
        onCopyId={handleCopy}
        onInvite={handleInvite}
      />
    );

    fireEvent.press(getByText('Invite'));
    fireEvent.press(getByText('Copy ID'));

    expect(handleInvite).toHaveBeenCalledTimes(1);
    expect(handleCopy).toHaveBeenCalledTimes(1);
  });
});


