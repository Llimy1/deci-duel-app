import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, FONTS, FS, S, R } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

export const ONBOARDING_KEY = '@deciduel/onboarded';
type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const TOTAL_SLIDES = 2;
const WAVE_BARS = 18;

// ── Slide 1 hero: 두 파형이 VS로 맞붙는 배틀 비주얼 ──────────────────
function BattleWave({ tick }: { tick: number }) {
  return (
    <View style={waveStyles.root}>
      {/* Player side — pink */}
      <View style={waveStyles.side}>
        {Array.from({ length: WAVE_BARS }).map((_, i) => {
          const h = Math.abs(Math.sin(tick * 0.11 + i * 0.42)) * 0.82 + 0.14;
          return (
            <View
              key={i}
              style={[
                waveStyles.bar,
                {
                  height: h * 80,
                  backgroundColor: C.pink,
                  opacity: 0.45 + h * 0.55,
                  shadowColor: C.pink,
                  shadowOpacity: h > 0.6 ? 0.9 : 0.4,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            />
          );
        })}
      </View>

      {/* VS badge */}
      <View style={waveStyles.vsBadge}>
        <Text style={waveStyles.vsText}>VS</Text>
      </View>

      {/* Opponent side — cyan */}
      <View style={waveStyles.side}>
        {Array.from({ length: WAVE_BARS }).map((_, i) => {
          const h =
            Math.abs(
              Math.sin(tick * 0.11 + (WAVE_BARS - 1 - i) * 0.42 + Math.PI * 0.65)
            ) *
              0.82 +
            0.14;
          return (
            <View
              key={i}
              style={[
                waveStyles.bar,
                {
                  height: h * 80,
                  backgroundColor: C.cyan,
                  opacity: 0.45 + h * 0.55,
                  shadowColor: C.cyan,
                  shadowOpacity: h > 0.6 ? 0.9 : 0.4,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Slide 2 hero: 중앙 벨커브 심메트릭 오디오 파형 ──────────────────
function SymmetricWave({ tick, width }: { tick: number; width: number }) {
  const COLS = 38;
  const availW = width - S[5] * 2;
  const barW = availW / COLS;

  return (
    <View style={{ width: availW, height: 96, flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: COLS }).map((_, i) => {
        const center = (COLS - 1) / 2;
        const dist = Math.abs(i - center) / center; // 0=중앙, 1=가장자리
        const bell = Math.exp(-dist * dist * 2.6);  // 중앙 강조 bell curve
        const anim = Math.abs(Math.sin(tick * 0.1 + (i / COLS) * Math.PI * 4));
        const halfH = (bell * 0.6 + anim * 0.4) * 42 + 4;
        const opacity = 0.55 + bell * 0.45;

        return (
          <View
            key={i}
            style={{
              width: barW - 1.5,
              marginHorizontal: 0.75,
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            {/* 위쪽 절반 */}
            <View style={{
              width: '85%',
              height: halfH,
              borderRadius: 2,
              backgroundColor: C.cyan,
              opacity,
              shadowColor: C.cyan,
              shadowOpacity: bell > 0.5 ? 0.7 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }} />
            {/* 아래쪽 절반 (미러, 더 흐리게) */}
            <View style={{
              width: '85%',
              height: halfH * 0.55,
              borderRadius: 2,
              backgroundColor: C.cyan,
              opacity: opacity * 0.35,
              marginTop: 2,
            }} />
          </View>
        );
      })}
    </View>
  );
}

// ── Step row ────────────────────────────────────────────────────────
function StepRow({ num, text, accent }: { num: string; text: string; accent: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.badge, { borderColor: `${accent}55`, backgroundColor: `${accent}18` }]}>
        <Text style={[stepStyles.num, { color: accent }]}>{num}</Text>
      </View>
      <Text style={stepStyles.text}>{text}</Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────
export default function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const isLast = page === TOTAL_SLIDES - 1;

  const scrollTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    navigation.replace('Login');
  };

  return (
    <View style={styles.root}>
      {/* 건너뛰기 */}
      <Pressable
        style={[styles.skipBtn, { top: top + 14 }]}
        onPress={handleFinish}
        hitSlop={16}
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </Pressable>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(newPage);
        }}
        style={{ flex: 1 }}
      >
        {/* ── Slide 1: 소리로 싸워라 ── */}
        <View style={[styles.slide, { width }]}>
          <LinearGradient
            colors={[`${C.pink}44`, `${C.purple}20`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.slideInner, { paddingTop: top + 56 }]}>
            {/* Hero: 배틀 파형 */}
            <BattleWave tick={tick} />

            {/* 배지 */}
            <View style={styles.badge}>
              <Text style={[styles.badgeLabel, { color: C.pink }]}>dB BATTLE</Text>
            </View>

            {/* 메인 헤딩 */}
            <Text style={[styles.heading, styles.glowPink]}>{'소리로\n싸워라'}</Text>

            {/* 서브 */}
            <Text style={styles.sub}>
              {'마이크 하나로 시작하는\n데시벨 1:1 대결 게임'}
            </Text>
          </View>
        </View>

        {/* ── Slide 2: 이렇게 싸워 ── */}
        <View style={[styles.slide, { width }]}>
          <LinearGradient
            colors={[`${C.cyan}35`, `${C.purple}18`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.slideInner, { paddingTop: top + 56 }]}>
            {/* Hero: 심메트릭 오디오 파형 */}
            <SymmetricWave tick={tick} width={width} />

            {/* 배지 */}
            <View style={[styles.badge, { borderColor: `${C.cyan}55`, backgroundColor: `${C.cyan}12` }]}>
              <Text style={[styles.badgeLabel, { color: C.cyan }]}>HOW TO PLAY</Text>
            </View>

            {/* 메인 헤딩 */}
            <Text style={[styles.heading, styles.glowCyan]}>{'이렇게\n싸워'}</Text>

            {/* 스텝 */}
            <View style={styles.steps}>
              <StepRow num="01" text="친구에게 방 코드를 공유해" accent={C.cyan} />
              <StepRow num="02" text="5초간 마이크에 최대한 크게 소리질러" accent={C.yellow} />
              <StepRow num="03" text="3라운드 중 2승이면 우승" accent={C.pink} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 내비 */}
      <View style={[styles.bottomNav, { paddingBottom: bottom + S[5] }]}>
        {/* 필 인디케이터 */}
        <View style={styles.pillRow}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pill,
                i === page
                  ? { width: 28, backgroundColor: C.pink, shadowColor: C.pink, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }
                  : { width: 8, backgroundColor: C.line },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        {!isLast ? (
          <Pressable onPress={() => scrollTo(1)} style={styles.cta}>
            <LinearGradient
              colors={[C.pink, C.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGrad}
            >
              <Text style={styles.ctaText}>다음  →</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={handleFinish} style={styles.cta}>
            <LinearGradient
              colors={[C.pink, C.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGrad}
            >
              <Text style={styles.ctaText}>시작하기  ⚡</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  skipBtn: {
    position: 'absolute',
    right: S[5],
    zIndex: 20,
  },
  skipText: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0.4,
  },
  slide: {
    flex: 1,
    overflow: 'hidden',
  },
  slideInner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: S[5],
    paddingBottom: 96,
  },
  badge: {
    marginTop: S[5],
    marginBottom: S[4],
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: `${C.pink}55`,
    backgroundColor: `${C.pink}12`,
  },
  badgeLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 2.8,
  },
  heading: {
    fontFamily: FONTS.display,
    fontSize: 80,
    lineHeight: 90,
    color: C.text,
    textAlign: 'center',
    marginBottom: S[4],
  },
  glowPink: {
    textShadowColor: C.pink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  glowCyan: {
    textShadowColor: C.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  sub: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  steps: {
    alignSelf: 'stretch',
    gap: S[3],
    marginTop: S[3],
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: S[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillRow: {
    flexDirection: 'row',
    gap: S[2],
    alignItems: 'center',
  },
  pill: {
    height: 4,
    borderRadius: 2,
  },
  cta: {
    borderRadius: R.pill,
    overflow: 'hidden',
  },
  ctaGrad: {
    paddingHorizontal: S[6],
    paddingVertical: 14,
    borderRadius: R.pill,
  },
  ctaText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: '#fff',
    letterSpacing: 0.3,
  },
});

const waveStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    alignSelf: 'stretch',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 4,
    gap: 2.5,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  vsBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surfaceDeep,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  vsText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: C.textMute,
    letterSpacing: 1.5,
  },
});

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[4],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.text,
    lineHeight: 20,
  },
});
