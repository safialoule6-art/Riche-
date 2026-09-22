import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { onboardingSlides } from '../constants/animations';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { RemoteLottie } from '../components/RemoteLottie';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const progress = useSharedValue(33.333);
  const slide = onboardingSlides[index] ?? onboardingSlides[0];
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  useEffect(() => { progress.value = withTiming(((index + 1) / onboardingSlides.length) * 100, { duration: 450 }); }, [index, progress]);
  const next = () => index === onboardingSlides.length - 1 ? navigation.replace('Home') : setIndex((value) => value + 1);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={styles.header}><Text style={styles.logo}>sunami<Text style={styles.dot}>.</Text></Text><Pressable onPress={() => navigation.replace('Home')} hitSlop={12}><Text style={styles.skip}>Passer</Text></Pressable></View>
    <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, progressStyle]} /></View>
    <View style={styles.body}>
      <Animated.View key={`animation-${index}`} entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={[styles.animationCard, { backgroundColor: slide.accent, width: Math.min(width - 40, 360) }]}>
        <RemoteLottie uri={slide.animation} autoPlay loop style={styles.animation} />
        <View style={styles.pageBadge}><Text style={styles.pageBadgeText}>{index + 1} / {onboardingSlides.length}</Text></View>
      </Animated.View>
      <Animated.View key={`copy-${index}`} entering={FadeInDown.delay(80).duration(420)} style={styles.copy}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text><Text style={styles.title}>{slide.title}</Text><Text style={styles.bodyText}>{slide.body}</Text>
      </Animated.View>
    </View>
    <AnimatedPressable style={styles.primaryButton} onPress={next}><Text style={styles.primaryText}>{index === onboardingSlides.length - 1 ? 'C’est parti' : 'Continuer'}</Text><Text style={styles.arrow}>→</Text></AnimatedPressable>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  logo: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -1 }, dot: { color: colors.limeDark }, skip: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: colors.line, borderRadius: 99, marginTop: spacing.lg, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: colors.limeDark, borderRadius: 99 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  animationCard: { height: 310, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', position: 'relative', ...shadow }, animation: { width: 270, height: 270 },
  pageBadge: { position: 'absolute', right: 14, top: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,.78)' }, pageBadgeText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  copy: { alignItems: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.xl }, eyebrow: { color: colors.limeDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center', marginTop: spacing.sm }, bodyText: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing.sm, maxWidth: 330 },
  primaryButton: { height: 58, borderRadius: radius.pill, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.sm }, primaryText: { color: colors.white, fontSize: 15, fontWeight: '800' }, arrow: { color: colors.lime, fontSize: 21, fontWeight: '700' },
});
