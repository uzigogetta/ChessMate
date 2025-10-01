import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Text, Card } from '@/ui/atoms';

export default function StatsScreen() {
	return (
		<Screen>
			<Stack.Screen options={{ title: 'Stats', headerLargeTitle: Platform.OS === 'ios', headerTransparent: Platform.OS === 'ios' }} />
			<ScrollView
				contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ padding: 24, gap: 16 }}
			>
				<Text style={{ fontSize: 24, fontWeight: '700' }}>Stats</Text>
				<Card style={{ gap: 8 }}>
					<Text muted>Player stats, streaks, and breakdowns will live here.</Text>
				</Card>
			</ScrollView>
		</Screen>
	);
}
