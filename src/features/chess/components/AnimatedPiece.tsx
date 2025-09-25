import React from 'react';
import { Image } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { usePieceAnimator } from '../animation/usePieceAnimator';
import { useRegisterAnimator } from '../animation/useRegisterAnimator';

type Props = { id: string; x: number; y: number; size: number; uri: any };

export const AnimatedPiece: React.FC<Props> = ({ id, x, y, size, uri }) => {
  const anim = usePieceAnimator(id);

  const registryApi = React.useMemo(
    () => ({
      id,
      instantTo: anim.instantTo,
      moveTo: anim.moveTo,
      captureFade: anim.captureFade,
      dragStart: anim.dragStart,
      dragEnd: anim.dragEnd,
      invalidShake: anim.invalidShake,
    }),
    [id, anim.instantTo, anim.moveTo, anim.captureFade, anim.dragStart, anim.dragEnd, anim.invalidShake]
  );

  useRegisterAnimator(registryApi);

  React.useLayoutEffect(() => {
    anim.opacity.value = 1;
    anim.scale.value = 1;
    anim.z.value = 0;
    anim.instantTo({ x, y });
  }, [id, x, y, anim.instantTo, anim.opacity, anim.scale, anim.z]);

  const style = useAnimatedStyle(
    () => ({
      position: 'absolute',
      width: size,
      height: size,
      opacity: anim.opacity.value,
      transform: [
        { translateX: anim.tx.value },
        { translateY: anim.ty.value - anim.z.value },
        { scale: anim.scale.value },
      ],
    }),
    [size]
  );

  return (
    <Animated.View pointerEvents="none" style={style}>
      <Image source={uri} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </Animated.View>
  );
};
