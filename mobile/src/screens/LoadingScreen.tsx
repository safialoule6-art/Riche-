import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { lottieUrls } from '../constants/animations';
import { RemoteLottie } from '../components/RemoteLottie';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Loading'>;

export function LoadingScreen({ navigation }: Props) {
  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  useEffect(() => { progress.value = withTiming(100, { duration: 1250 }); const timeout = setTimeout(() => navigation.replace('Onboarding'), 1450); return () => clearTimeout(timeout); }, [navigation, progress]);

  return <View style={styles.container}>
    <StatusBar style="dark" />
    <Animated.View entering={FadeIn.duration(500)} style={styles.logoMark}><Text style={styles.logoWave}>🌊</Text></Animated.View>
    <Animated.View entering={FadeInDown.delay(150).duration(550)} style={styles.content}>
      <Text style={styles.logo}>sunami<Text style={styles.dot}>.</Text></Text>
      <Text style={styles.caption}>Une histoire. Une langue. Toi.</Text>
      <RemoteLottie uri={lottieUrls.loader} autoPlay loop style={styles.loader} />
      <View style={styles.track}><Animated.View style={[styles.fill, progressStyle]} /></View>
      <Text style={styles.loading}>Préparation de ton aventure...</Text>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logoMark: { width: 74, height: 74, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  logoWave: { fontSize: 36 },
  content: { alignItems: 'center', marginTop: spacing.lg },
  logo: { color: colors.ink, fontSize: 38, fontWeight: '800', letterSpacing: -2 },
  dot: { color: colors.limeDark },
  caption: { color: colors.muted, fontSize: 14, marginTop: spacing.xs },
  loader: { width: 96, height: 96, marginTop: spacing.xl },
  track: { width: 160, height: 6, borderRadius: 99, backgroundColor: colors.line, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: '100%', backgroundColor: colors.limeDark, borderRadius: 99 },
  loading: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
});
