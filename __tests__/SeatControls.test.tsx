import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SeatControls } from '@/features/online/room-screen/SeatControls';
import type { RoomState } from '@/net/types';

const baseRoom: RoomState = {
  roomId: 'room42',
  mode: '2v2',
  members: [
    { id: 'me', name: 'Me' },
    { id: 'ally', name: 'Ally' },
  ],
  seats: { w1: 'me' },
  driver: 'w',
  fen: 'start',
  historySAN: [],
  started: false,
};

describe('SeatControls', () => {
  it('renders seat buttons and triggers handlers', () => {
    const onSeatSide = jest.fn();
    const onRelease = jest.fn();

    const { getByText } = render(
      <SeatControls
        room={baseRoom}
        meId="me"
        mySeats={['w1']}
        isMinimal={false}
        nameById={(id) => (id === 'ally' ? 'Ally' : 'Unknown')}
        onSeatSide={onSeatSide}
        onRelease={onRelease}
      />
    );

    fireEvent.press(getByText('Join Black'));
    fireEvent.press(getByText('Release Seat'));

    expect(onSeatSide).toHaveBeenCalledWith('b');
    expect(onRelease).toHaveBeenCalled();
    expect(getByText('w1 • you')).toBeTruthy();
  });

  it('hides when minimal room', () => {
    const { queryByText } = render(
      <SeatControls
        room={{ ...baseRoom, mode: '1v1' }}
        meId="me"
        mySeats={[]}
        isMinimal
        nameById={() => ''}
        onSeatSide={() => {}}
        onRelease={() => {}}
      />
    );

    expect(queryByText('Seats')).toBeNull();
  });
});


