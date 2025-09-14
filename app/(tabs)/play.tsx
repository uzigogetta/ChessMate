import React from 'react';
import { router } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { Sentry } from '@/sentry';

export default function PlayScreen() {
	return (
		<Screen>
			<Card>
				<Text>Play</Text>
				<Button title="Start Local Game" onPress={() => router.push('/game/local')} />
				<Button title="Play vs AI" onPress={() => router.push('/game/ai')} />
				<Button title="Play Online" onPress={() => router.push('/game/online')} />
				{/* TEMP: Sentry test button */}
				<Button title="Try!" onPress={() => Sentry.captureException(new Error('First error'))} />
			</Card>
		</Screen>
	);
}


