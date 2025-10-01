import React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Screen, Card, Text } from '@/ui/atoms';

export default function ProfileScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	return (
		<Screen>
			<Stack.Screen
				options={{
					headerTitle: 'Profile',
					headerLargeTitle: Platform.OS === 'ios',
					headerTransparent: Platform.OS === 'ios',
				}}
			/>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
				contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 140, gap: 20 }}
			>
				<Text style={{ fontSize: 24, fontWeight: '700' }}>Your account</Text>
				<View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
					<QuickAction label="Archive" onPress={() => router.push('/profile/archive')} />
					<QuickAction label="Stats" onPress={() => router.push('/profile/stats')} />
					<QuickAction label="Settings" onPress={() => router.push('/(tabs)/profile/settings')} />
				</View>
				<Card style={{ alignItems: 'flex-start', gap: 12 }}>
					<Text style={{ fontSize: 18, fontWeight: '600' }}>Archive</Text>
					<Text muted>Browse saved matches, replays, and analysis.</Text>
					<Pressable onPress={() => router.push('/profile/archive')}>
						<Text style={{ color: '#3178ff', fontWeight: '600' }}>Open Archive →</Text>
					</Pressable>
				</Card>
				<Card style={{ alignItems: 'flex-start', gap: 12 }}>
					<Text style={{ fontSize: 18, fontWeight: '600' }}>Settings</Text>
					<Text muted>Adjust themes, notifications, and Coach Mode defaults.</Text>
					<Pressable onPress={() => router.push('/(tabs)/profile/settings')}>
						<Text style={{ color: '#3178ff', fontWeight: '600' }}>Open Settings →</Text>
					</Pressable>
				</Card>
			</ScrollView>
		</Screen>
	);
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Pressable
			onPress={onPress}
			style={{ flexGrow: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(72,72,74,0.16)', alignItems: 'center' }}
			accessibilityRole="button"
		>
			<Text style={{ fontWeight: '600' }}>{label}</Text>
		</Pressable>
	);
}


