import React from 'react';
import { Screen, Card, Text } from '@/ui/atoms';
import { View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
	return (
		<Screen>
			<View style={{ position: 'absolute', top: 16, right: 16 }}>
				<Link href="/settings" asChild>
					<Pressable>
						<Ionicons name="settings-outline" size={24} color="#F2F2F7" />
					</Pressable>
				</Link>
			</View>
			<Card>
				<Text>Profile</Text>
			</Card>
		</Screen>
	);
}


