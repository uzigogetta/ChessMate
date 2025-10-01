import React from 'react';
import { Stack } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';

export default function FriendsStackLayout() {
	const sys = useColorScheme();
	const { theme } = useSettings();
	const active: ThemeName = (theme === 'system' ? (sys === 'dark' ? 'dark' : 'light') : theme) as ThemeName;
	const c = themes[active];
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerLargeTitle: Platform.OS === 'ios',
				headerTransparent: Platform.OS === 'ios',
				headerLargeTitleShadowVisible: false,
				headerShadowVisible: Platform.OS !== 'ios',
				headerTitleStyle: { color: c.text },
				headerLargeTitleStyle: { color: c.text },
				headerTintColor: active === 'dark' ? '#FFFFFF' : '#000000',
				...(Platform.OS === 'ios' ? { headerBlurEffect: 'systemChromeMaterial' } : { headerStyle: { backgroundColor: c.background } }),
				headerBackTitleVisible: false,
			headerBackButtonDisplayMode: 'minimal',
			}}
		>
			<Stack.Screen name="index" options={{ headerTitle: 'Friends' }} />
		</Stack>
	);
}


