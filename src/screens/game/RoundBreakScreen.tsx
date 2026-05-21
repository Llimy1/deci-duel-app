import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Card } from '../../components/ui';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'RoundBreak'>;

const TIPS = [
  '더 크게 소리질러! 입을 크게 벌릴수록 데시벨이 올라가.',
  '배에서 나오는 소리가 진짜야. 복식호흡 기억해.',
  '마이크에 최대한 가까이! 거리가 클수록 dB이 줄어.',
  '고음이 저음보다 측정값이 높게 나와.',
  '짧고 강하게 vs 길게 유지 — 둘 다 해봐!',
];

export default function RoundBreakScreen({ navigation, route }: Props) {
  const { round, meScore, oppScore } = route.params;
  const [countdown, setCountdown] = useState(3);
  const tip = TIPS[round % TIPS.length];

  useEffect(() => {
    if (countdown <= 0) {
      navigation.replace('Countdown');
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const totalRounds = round;
  const dots = Array.from({ length: 3 }, (_, i) => i + 1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dotsRow}>
        {dots.map((d) => {
          const isPlayed = d <= totalRounds;
          return (
            <View key={d} style={styles.dotWrap}>
              <View style={[styles.dot, isPlayed && styles.dotActive]} />
              <Text style={styles.dotLabel}>R{d}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.scoreWrap}>
        <Text style={styles.scoreLabel}>스코어</Text>
        <Text style={styles.score}>
          <Text style={{ color: C.lime }}>{meScore}</Text>
          {' — '}
          <Text style={{ color: C.pink }}>{oppScore}</Text>
        </Text>
      </View>

      <Card style={styles.tipCard} padding={20}>
        <Text style={styles.tipLabel}>팁</Text>
        <Text style={styles.tipText}>{tip}</Text>
      </Card>

      <View style={styles.countdownWrap}>
        <Text style={styles.countdownLabel}>다음 라운드까지</Text>
        <Text style={styles.countdown}>{countdown}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[5],
    gap: S[8],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: S[6],
    alignItems: 'center',
  },
  dotWrap: {
    alignItems: 'center',
    gap: S[2],
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.surface2,
    borderWidth: 2,
    borderColor: C.line,
  },
  dotActive: {
    backgroundColor: C.pink,
    borderColor: C.pink,
  },
  dotLabel: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0.5,
  },
  scoreWrap: {
    alignItems: 'center',
    gap: S[2],
  },
  scoreLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  score: {
    fontFamily: FONTS.display,
    fontSize: FS['3xl'],
    color: C.text,
  },
  tipCard: {
    width: '100%',
    gap: S[2],
  },
  tipLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
    marginBottom: S[2],
  },
  tipText: {
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.textDim,
    lineHeight: 22,
  },
  countdownWrap: {
    alignItems: 'center',
    gap: S[1],
  },
  countdownLabel: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  countdown: {
    fontFamily: FONTS.display,
    fontSize: FS['4xl'],
    color: C.cyan,
  },
});
