import React from 'react';
import { router, Stack } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlayScreen() {
	const insets = useSafeAreaInsets();
	return (
		<Screen>
			<Stack.Screen options={{ headerLargeTitle: Platform.OS === 'ios' }} />
			<View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
				<Card>
					<Text>Play</Text>
					<Button title="Start Local Game" onPress={() => router.push('/game/local')} />
					<Button title="Play vs AI" onPress={() => router.push('/game/ai.menu')} />
					<Button title="Play Online" onPress={() => router.push('/game/online')} />
				</Card>
			</View>
		</Screen>
	);
}
