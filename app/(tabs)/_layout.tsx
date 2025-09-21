import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import FloatingTabBar from '@/ui/FloatingTabBar';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { TABS } from '@/ui/tabs.config';

export default function TabsLayout() {
    if (Platform.OS === 'ios') {
        return (
            <NativeTabs
                minimizeBehavior="onScrollDown"
                disableTransparentOnScrollEdge
            >
                {TABS.map((t) => (
                    <NativeTabs.Trigger key={t.name} name={t.name as any} disablePopToTop={false} disableScrollToTop={false}>
                        <Icon sf={{ default: t.ios.sfDefault, selected: t.ios.sfSelected }} />
                        <Label>{t.label}</Label>
                    </NativeTabs.Trigger>
                ))}
            </NativeTabs>
        );
    }
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#fff',
                tabBarInactiveTintColor: '#9AA0A6',
                tabBarItemStyle: { paddingVertical: 0 },
                tabBarStyle: {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 0, // hidden, custom bar used
                    borderTopWidth: 0,
                    backgroundColor: 'transparent',
                    elevation: 0
                },
                tabBarBackground: () => <View />,
                tabBarLabel: () => null
            }}
            tabBar={(props) => <FloatingTabBar {...props} />}
        >
			<Tabs.Screen name="play" options={{ title: 'Play' }} />
			<Tabs.Screen name="puzzles" options={{ title: 'Puzzles' }} />
			<Tabs.Screen name="archive" options={{ title: 'Archive' }} />
			<Tabs.Screen name="profile" options={{ title: 'Profile' }} />
		</Tabs>
	);
}


