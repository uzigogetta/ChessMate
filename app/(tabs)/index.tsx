import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, View, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useRecentGames } from '@/archive/useRecentGames';
import { RecentGameCard } from '@/features/archive/RecentGameCard';

export default function HomeScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { items, loading, refreshing, reload } = useRecentGames(3);

	const emptyState = useMemo(() => (
		<Card style={{ alignItems: 'flex-start', gap: 12 }}>
			<Text style={{ fontSize: 18, fontWeight: '600' }}>Recent games</Text>
			<Text muted style={{ fontSize: 14 }}>Play a quick match and your latest results will appear here.</Text>
			<View style={{ flexDirection: 'row', gap: 10 }}>
				<Button title="VS AI" onPress={() => router.push('/game/ai')} />
				<Button title="Play Online" onPress={() => router.push('/game/online')} />
			</View>
		</Card>
	), [router]);

	const recentSection = useMemo(() => {
		if (loading) {
			return (
				<Card style={{ gap: 12 }}>
					<Text style={{ fontSize: 18, fontWeight: '600' }}>Recent games</Text>
					<Text muted style={{ fontSize: 14 }}>Fetching the latest results…</Text>
					{[0, 1, 2].map((key) => (
						<View key={key} style={{ opacity: 0.2 }}>
							<RecentGameCard.Skeleton />
						</View>
					))}
				</Card>
			);
		}
		if (!items.length) {
			return emptyState;
		}
		return (
			<Card style={{ alignItems: 'flex-start', gap: 12 }}>
				<View style={{ gap: 6 }}>
					<Text style={{ fontSize: 18, fontWeight: '600' }}>Recent games</Text>
					<Text muted style={{ fontSize: 14 }}>Jump straight into your saved matches and analyses.</Text>
				</View>
				<View style={{ width: '100%', gap: 12 }}>
					{items.map((item) => (
						<RecentGameCard
							key={item.id}
							game={item}
							onReplay={() => router.push({ pathname: '/archive/[id]', params: { id: item.id } })}
						/>
					))}
				</View>
				<Button title="Open Archive" onPress={() => router.push('/profile/archive')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
			</Card>
		);
	}, [loading, items, emptyState, router]);
	return (
		<Screen>
			<Stack.Screen
				options={{
					headerTitle: 'Home',
					headerLargeTitle: Platform.OS === 'ios',
					headerTransparent: Platform.OS === 'ios',
				}}
			/>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
				contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120, gap: 16 }}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
			>
				<Text style={{ fontSize: 24, fontWeight: '700' }}>Welcome back</Text>
				<View style={{ marginTop: 4 }}>{recentSection}</View>
				<Card style={{ alignItems: 'flex-start', gap: 12 }}>
					<Text style={{ fontSize: 18, fontWeight: '600' }}>Quick actions</Text>
					<Text muted style={{ fontSize: 14 }}>Start a new session with your preferred mode.</Text>
					<View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
						<Button title="Play Online" onPress={() => router.push('/game/online')} style={{ flexGrow: 1 }} />
						<Button title="VS AI" onPress={() => router.push('/game/ai')} style={{ flexGrow: 1 }} />
						<Button title="Local board" onPress={() => router.push('/game/local')} style={{ flexGrow: 1 }} />
					</View>
				</Card>
			</ScrollView>
		</Screen>
	);
}


