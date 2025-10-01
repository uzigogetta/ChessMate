import React, { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text } from '@/ui/atoms';
import { RecentGameRow } from '@/archive/db';

type Props = {
  game: RecentGameRow;
  onReplay: () => void;
};

function formatMode(mode: string) {
  switch (mode) {
    case 'ai':
      return 'VS AI';
    case 'local':
      return 'Local';
    case '1v1':
      return 'Online';
    default:
      return mode;
  }
}

export const RecentGameCard = memo(function RecentGameCard({ game, onReplay }: Props) {
  const subtitle = useMemo(() => {
    const date = new Date(game.createdAt);
    return `${date.toLocaleDateString()} · ${formatMode(game.mode)} · ${game.moves} moves`;
  }, [game.createdAt, game.mode, game.moves]);

  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{`${game.whiteName || 'White'} vs ${game.blackName || 'Black'}`}</Text>
          <Text muted style={{ marginTop: 2, fontSize: 13 }}>{subtitle}</Text>
        </View>
        <ResultBadge result={game.result} />
      </View>
      <Pressable onPress={onReplay} style={{ alignSelf: 'flex-start' }} accessibilityRole="button">
        <Text style={{ color: '#3178ff', fontWeight: '600' }}>Replay →</Text>
      </Pressable>
    </Card>
  );
});

RecentGameCard.displayName = 'RecentGameCard';

RecentGameCard.Skeleton = function RecentGameCardSkeleton() {
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16, gap: 12, opacity: 0.5 }}>
      <View style={{ height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <View style={{ height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)' }} />
      <View style={{ height: 16, width: 80, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)' }} />
    </Card>
  );
};

function ResultBadge({ result }: { result: string }) {
  let background = 'rgba(0,0,0,0.08)';
  let label = result;
  if (result === '1-0') {
    background = 'rgba(52,199,89,0.18)';
    label = '1-0';
  } else if (result === '0-1') {
    background = 'rgba(255,59,48,0.18)';
    label = '0-1';
  } else if (result === '1/2-1/2') {
    background = 'rgba(142,142,147,0.18)';
    label = '½';
  }
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: background }}>
      <Text style={{ fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

