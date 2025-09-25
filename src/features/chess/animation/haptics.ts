import * as Haptics from 'expo-haptics';

export const haptics = {
  capture() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{}); },
  check() { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(()=>{}); },
  win() { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{}); },
  move() { Haptics.selectionAsync().catch(()=>{}); },
};


