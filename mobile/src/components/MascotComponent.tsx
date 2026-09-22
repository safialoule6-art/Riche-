import LottieView from 'lottie-react-native';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { lottieUrls } from '../constants/animations';
import { colors, radius, shadow, spacing } from '../theme';
import { RemoteLottie } from './RemoteLottie';

export function MascotComponent({ onReact }: { onReact?: () => void }) {
  const lottieRef = useRef<LottieView>(null);
  const reactToTap = () => { lottieRef.current?.reset(); lottieRef.current?.play(); onReact?.(); };

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Réveiller Sunny" onPress={reactToTap}>
        <View style={styles.orbit}>
          <View style={styles.sparkle}><Text style={styles.sparkleText}>✦</Text></View>
          <RemoteLottie ref={lottieRef} uri={lottieUrls.mascot} autoPlay loop style={styles.lottie} />
        </View>
      </Pressable>
      <Text style={styles.hint}>Tape sur Sunny pour l'encourager</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  orbit: { width: 194, height: 194, borderRadius: 97, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.white, ...shadow },
  lottie: { width: 168, height: 168 },
  sparkle: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sparkleText: { color: colors.ink, fontSize: 19, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
});
