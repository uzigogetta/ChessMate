import 'react-native-gesture-handler';
import '@/sentry';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<StatusBar style="light" />
			<Stack screenOptions={{ headerShown: true }} />
		</SafeAreaProvider>
	);
}


