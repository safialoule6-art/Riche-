import { PropsWithChildren } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type Props = PropsWithChildren<PressableProps>;
const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({ children, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressableBase
      {...props}
      style={[props.style, animatedStyle]}
      onPressIn={(event) => { scale.value = withSpring(0.96, { damping: 14, stiffness: 260 }); props.onPressIn?.(event); }}
      onPressOut={(event) => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); props.onPressOut?.(event); }}
    >
      {children}
    </AnimatedPressableBase>
  );
}
