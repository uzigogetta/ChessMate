import React from 'react';
import { Tabs } from 'expo-router';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';

export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: true,
				headerRight: () => <ConnectionIndicator />
			}}
		>
			<Tabs.Screen name="play" options={{ title: 'Play' }} />
			<Tabs.Screen name="puzzles" options={{ title: 'Puzzles' }} />
			<Tabs.Screen name="archive" options={{ title: 'Archive' }} />
			<Tabs.Screen name="profile" options={{ title: 'Profile' }} />
		</Tabs>
	);
}


