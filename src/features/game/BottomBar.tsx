import React, { useMemo, useState, useCallback } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { themes, ThemeName } from '@/ui/tokens';
import { Text } from '@/ui/atoms';
import { useReview } from '@/features/view/review.store';
import { toast } from '@/ui/toast';

type Props = {
  room?: any;
  mySide: 'w' | 'b' | null;
  onUndo: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onGoLive: () => void;
  bottomInset: number;
  iconColor: string;
  mode: ThemeName;
  onFlip: () => void;
  soundsEnabled: boolean;
  toggleSounds: () => void;
  hapticsEnabled: boolean;
  toggleHaptics: () => void;
  boardTheme: 'default' | 'classicGreen' | 'native';
  onSelectBoardTheme: (t: 'default' | 'classicGreen' | 'native') => void;
  onOpenSettings: () => void;
};

type ThemeOption = {
  id: 'default' | 'classicGreen' | 'native';
  label: string;
  description: string;
  swatch: [string, string];
};

const BAR_HEIGHT = 64;
const THEME_OPTIONS: ThemeOption[] = [
  { id: 'default', label: 'Aurora', description: 'Balanced teal & ivory palette', swatch: ['#3AAFA9', '#F6F6F6'] },
  { id: 'classicGreen', label: 'Classic Green', description: 'Vintage tournament colors', swatch: ['#2F5233', '#F2D7A0'] },
  { id: 'native', label: 'Contrast', description: 'High contrast monochrome', swatch: ['#1C1C1E', '#ECECEC'] },
];

export function BottomBar(props: Props) {
  const {
    room,
    mySide,
    onUndo,
    onOfferDraw,
    onResign,
    onGoLive,
    bottomInset,
    iconColor,
    mode,
    onFlip,
    soundsEnabled,
    toggleSounds,
    hapticsEnabled,
    toggleHaptics,
    boardTheme,
    onSelectBoardTheme,
    onOpenSettings,
  } = props;

  const { plyIndex, setPlyIndex } = useReview();
  const livePlies = room?.historySAN?.length ?? 0;
  const reviewing = plyIndex < livePlies;
  const insets = useSafeAreaInsets();

  const ripple = mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const iconBg = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const iconBorder = mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  const [sheetMode, setSheetMode] = useState<'menu' | 'themes'>('menu');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);

  const sheetTranslate = useSharedValue(320);
  const sheetHeight = useSharedValue(320);
  const sheetDragStart = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetTranslate.value }] }));

  const handleSheetClosed = useCallback(() => {
    setSheetMounted(false);
    setSheetVisible(false);
    setSheetMode('menu');
  }, []);

  const openSheet = useCallback((modeKey: 'menu' | 'themes') => {
    setSheetMode(modeKey);
    if (!sheetMounted) {
      setSheetMounted(true);
      requestAnimationFrame(() => {
        scrimOpacity.value = withTiming(1, { duration: 200 });
        sheetTranslate.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      });
    } else {
      scrimOpacity.value = withTiming(1, { duration: 200 });
      sheetTranslate.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    }
    setSheetVisible(true);
  }, [sheetMounted, scrimOpacity, sheetTranslate]);

  const closeSheet = useCallback(() => {
    scrimOpacity.value = withTiming(0, { duration: 160 });
    sheetTranslate.value = withTiming(sheetHeight.value, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(handleSheetClosed)();
    });
  }, [handleSheetClosed, scrimOpacity, sheetHeight, sheetTranslate]);

  const sheetPanGesture = useMemo(() =>
    Gesture.Pan()
      .enabled(sheetMounted)
      .onBegin(() => {
        sheetDragStart.value = sheetTranslate.value;
      })
      .onChange((event) => {
        const next = Math.min(Math.max(0, sheetDragStart.value + event.translationY), sheetHeight.value);
        sheetTranslate.value = next;
        const ratio = sheetHeight.value <= 0 ? 0 : 1 - Math.min(1, next / sheetHeight.value);
        scrimOpacity.value = ratio;
      })
      .onEnd((event) => {
        const next = sheetTranslate.value;
        const shouldClose = event.translationY > 72 || event.velocityY > 650 || next > sheetHeight.value * 0.45;
        if (shouldClose) {
          scrimOpacity.value = withTiming(0, { duration: 150 });
          sheetTranslate.value = withTiming(sheetHeight.value, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => {
            if (finished) runOnJS(handleSheetClosed)();
          });
        } else {
          scrimOpacity.value = withTiming(1, { duration: 160 });
          sheetTranslate.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
        }
      }),
    [handleSheetClosed, sheetMounted, sheetDragStart, sheetHeight, sheetTranslate, scrimOpacity]
  );

  const handleSheetLayout = useCallback(
    (event: any) => {
      const h = event.nativeEvent.layout.height + 24;
      sheetHeight.value = h;
      if (!sheetMounted) {
        sheetTranslate.value = h;
      }
    },
    [sheetHeight, sheetTranslate, sheetMounted]
  );

  const IconButton = ({
    name,
    onPress,
    accessibilityLabel,
    disabled = false,
    onDisabledPress,
  }: {
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
    onDisabledPress?: () => void;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) {
          onDisabledPress?.();
          if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      android_ripple={Platform.OS === 'android' ? { color: ripple, borderless: true } : undefined}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : iconBg,
        borderWidth: Platform.OS === 'ios' ? 0 : 1,
        borderColor: Platform.OS === 'ios' ? 'transparent' : iconBorder,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Ionicons name={name as any} size={26} color={disabled ? (themes[mode].muted as string) : iconColor} />
    </Pressable>
  );

  const Row = ({
    children,
    onPress,
    danger,
    disabled = false,
    onDisabledPress,
  }: {
    children: React.ReactNode;
    onPress: () => void;
    danger?: boolean;
    disabled?: boolean;
    onDisabledPress?: () => void;
  }) => (
    <Pressable
      onPress={() => {
        if (disabled) {
          onDisabledPress?.();
          if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      accessibilityRole="button"
      android_ripple={{ color: danger ? 'rgba(255,59,48,0.18)' : ripple }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </Pressable>
  );

  const menuCanOfferDraw = Boolean(room && room.phase === 'ACTIVE' && !room.result && !room?.pending?.drawFrom && mySide);
  const menuCanResign = Boolean(room && room.phase === 'ACTIVE' && !room.result && mySide);
  const menuCanRematch = Boolean(room && room.result && !room?.pending?.restartFrom);

  const handleMenuIconPress = useCallback(() => {
    if (!sheetMounted) {
      openSheet('menu');
    } else if (!sheetVisible) {
      openSheet('menu');
    } else if (sheetMode === 'themes') {
      setSheetMode('menu');
    } else {
      closeSheet();
    }
  }, [sheetMounted, sheetVisible, sheetMode, openSheet, closeSheet]);

  const menuIconName = !sheetVisible ? 'menu-outline' : sheetMode === 'themes' ? 'arrow-back-outline' : 'close-outline';
  const menuIconLabel = !sheetVisible
    ? 'Open game menu'
    : sheetMode === 'themes'
    ? 'Back to game menu'
    : 'Close game menu';

  const openThemesSheet = useCallback(() => {
    if (!sheetMounted) {
      openSheet('themes');
    } else {
      setSheetMode('themes');
    }
  }, [openSheet, sheetMounted]);

  const handleSelectTheme = useCallback(
    (themeId: 'default' | 'classicGreen' | 'native') => {
      onSelectBoardTheme(themeId);
      closeSheet();
    },
    [closeSheet, onSelectBoardTheme]
  );

  const MenuList = () => {
    const onOfferDrawDisabled = () => {
      if (room?.result) return toast('Game finished. Cannot offer draw.');
      if (!mySide) return toast('Sit down to offer a draw.');
      if (room?.pending?.drawFrom) return toast('Draw offer already pending.');
      return toast('Unavailable right now.');
    };

    const onResignDisabled = () => {
      if (room?.result) return toast('Game finished. Resign unavailable.');
      if (!mySide) return toast('Sit down to resign.');
      return toast('Unavailable right now.');
    };

    const onRematchDisabled = () => toast('Rematch already requested.');

    return (
      <View style={{ borderRadius: 18, overflow: 'hidden' }}>
        {room?.result && (
          <>
            <Row onPress={() => { (room?.net as any)?.restart?.(); closeSheet(); }} disabled={!menuCanRematch} onDisabledPress={onRematchDisabled}>
              <Ionicons name="refresh" size={22} color={iconColor} />
              <Text style={{ fontSize: 16 }}>Request Rematch</Text>
            </Row>
            <View style={{ height: 6, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
          </>
        )}
        <Row onPress={() => { onOfferDraw(); closeSheet(); }} disabled={!menuCanOfferDraw} onDisabledPress={onOfferDrawDisabled}>
          <Ionicons name="hand-left-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Offer Draw</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
        <Row onPress={() => { onResign(); closeSheet(); }} danger disabled={!menuCanResign} onDisabledPress={onResignDisabled}>
          <Ionicons name="flag-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16, color: Platform.OS === 'ios' ? '#FF3B30' : '#FF453A' }}>Resign</Text>
        </Row>
        <View style={{ height: 6, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
        <Row onPress={() => { onFlip(); closeSheet(); }}>
          <Ionicons name="swap-vertical" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Flip Board</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
        <Row onPress={toggleSounds}>
          <Ionicons name={soundsEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>{soundsEnabled ? 'Disable Sounds' : 'Enable Sounds'}</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
        <Row onPress={toggleHaptics}>
          <Ionicons name={hapticsEnabled ? 'phone-portrait-outline' : 'phone-portrait'} size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>{hapticsEnabled ? 'Disable Haptics' : 'Enable Haptics'}</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
        <Row onPress={openThemesSheet}>
          <Ionicons name="color-palette-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Board Themes</Text>
        </Row>
        <View style={{ height: 1, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#E5E5EA' }} />
        <Row onPress={() => { onOpenSettings(); closeSheet(); }}>
          <Ionicons name="settings-outline" size={22} color={iconColor} />
          <Text style={{ fontSize: 16 }}>Settings</Text>
        </Row>
      </View>
    );
  };

  const ThemeList = () => (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={() => setSheetMode('menu')}
        accessibilityRole="button"
        android_ripple={{ color: ripple }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
      >
        <Ionicons name="chevron-back" size={22} color={iconColor} />
        <Text style={{ fontSize: 16 }}>Back to menu</Text>
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Board Themes</Text>
      <Text style={{ fontSize: 12, color: themes[mode].muted as string }}>
        Pick a board style that matches your vibe. Changes apply immediately.
      </Text>
      {THEME_OPTIONS.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => handleSelectTheme(option.id)}
          style={{
            borderRadius: 16,
            padding: 14,
            borderWidth: option.id === boardTheme ? 2 : 1,
            borderColor: option.id === boardTheme ? (mode === 'dark' ? '#32D74B' : '#0A84FF') : (mode === 'dark' ? '#2C2C2E' : '#D1D1D6'),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{option.label}</Text>
            <Text style={{ fontSize: 12, marginTop: 4, color: themes[mode].muted as string }}>{option.description}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {option.swatch.map((color, index) => (
              <View key={`${option.id}-${index}`} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' }} />
            ))}
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR_HEIGHT + Math.max(insets.bottom, bottomInset) }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, bottomInset), alignItems: 'center' }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', gap: 10 }}>
          <IconButton name={menuIconName as any} accessibilityLabel={menuIconLabel} onPress={handleMenuIconPress} />
          <IconButton
            name="arrow-back-outline"
            accessibilityLabel="Go back one move"
            onPress={() => setPlyIndex(Math.max(0, plyIndex - 1))}
            disabled={!reviewing && plyIndex <= 0}
            onDisabledPress={() => toast('No earlier moves to review')}
          />
          <IconButton
            name="arrow-forward-outline"
            accessibilityLabel="Advance one move"
            onPress={() => setPlyIndex(Math.min(livePlies, plyIndex + 1))}
            disabled={plyIndex >= livePlies}
            onDisabledPress={() => toast('Already at the latest move')}
          />
          <IconButton name="play-outline" accessibilityLabel="Jump to live position" onPress={onGoLive} />
          <IconButton name="refresh-outline" accessibilityLabel="Undo last move" onPress={onUndo} />
        </View>
      </View>

      {sheetMounted && (
        <Animated.View pointerEvents="auto" style={{ position: 'absolute', inset: 0 }}>
          <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)' }, scrimStyle]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss menu" style={{ flex: 1 }} onPress={closeSheet} />
          </Animated.View>
          <GestureDetector gesture={sheetPanGesture}>
            <Animated.View onLayout={handleSheetLayout} style={[{ position: 'absolute', left: 12, right: 12, bottom: Math.max(insets.bottom, bottomInset) }, sheetStyle]}>
              <BlurView intensity={32} tint={mode} style={{ paddingVertical: 16, paddingHorizontal: 14, borderRadius: 24, overflow: 'hidden' }}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)' }} />
                </View>
                {sheetMode === 'menu' ? <MenuList /> : <ThemeList />}
              </BlurView>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      )}
    </View>
  );
}
