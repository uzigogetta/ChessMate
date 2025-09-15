import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';
import { useRoomStore } from '@/features/online/room.store';
import { isUploaded } from '@/archive/cloud';

export default function HeaderIndicators() {
  const room = useRoomStore((s) => s.room);
  const [introFlash, setIntroFlash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIntroFlash(false), 1200);
    return () => clearTimeout(t);
  }, []);
  const cloudUploading = useMemo(() => {
    if (!room) return false;
    if (room.phase !== 'RESULT') return false;
    const keyPrefix = `${room.roomId}-${room.finishedAt || ''}`;
    const maybeIds = [keyPrefix, `${room.roomId}-${room.finishedAt || Date.now()}`];
    return !maybeIds.some((id) => isUploaded(id));
  }, [room?.phase, room?.roomId, room?.finishedAt]);

  // Android: compact two wells, no background
  if (Platform.OS !== 'ios') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 26 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CloudUploadIndicator flashOnMount />
        </View>
        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <ConnectionIndicator />
        </View>
      </View>
    );
  }

  // iOS: no background; keep a fixed 26px inner box for connection centered
  const WELL = 22; const BASE = 26; const GAP = 4;
  const cloudVisible = introFlash || cloudUploading;
  const extra = cloudVisible ? GAP + WELL : 0;
  return (
    <View style={{ height: BASE, width: BASE + extra }}>
      {/* Inner fixed box ensures the connection stays perfectly centered */}
      <View style={{ position: 'absolute', right: 0, top: 0, height: BASE, width: BASE }}>
        <View style={{ position: 'absolute', left: (BASE - WELL) / 2 + (cloudVisible ? 0 : 3), top: (BASE - WELL) / 2, width: WELL, height: WELL, borderRadius: WELL / 2, alignItems: 'center', justifyContent: 'center' }}>
          <ConnectionIndicator />
        </View>
      </View>
      {cloudVisible && (
        <View style={{ position: 'absolute', left: 0, top: (BASE - WELL) / 2, width: WELL, height: WELL, borderRadius: WELL / 2, alignItems: 'center', justifyContent: 'center' }}>
          <CloudUploadIndicator flashOnMount />
        </View>
      )}
    </View>
  );
}


