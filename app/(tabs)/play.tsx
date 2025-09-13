import React from 'react';
import { router } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';

export default function PlayScreen() {
	return (
		<Screen>
			<Card>
				<Text>Play</Text>
				<Button title="Start Local Game" onPress={() => router.push('/game/local')} />
				<Button title="Play vs AI" onPress={() => router.push('/game/ai')} />
			</Card>
		</Screen>
	);
}


