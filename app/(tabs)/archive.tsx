import React from 'react';
import { Screen } from '@/ui/atoms';
import ArchiveListScreen from '../archive';

export default function ArchiveScreen() {
	return (
		<Screen style={{ paddingHorizontal: 12 }}>
			<ArchiveListScreen />
		</Screen>
	);
}


