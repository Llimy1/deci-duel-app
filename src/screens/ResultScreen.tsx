import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StageBg, Btn, Card, Chip, Av, Row } from '../components/ui';
import { C, FONTS, FS, S, R } from '../theme';
import { useAppStore } from '../store';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export default function ResultScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const result = useAppStore((s) => s.lastResult) ?? { mePeak: 118, oppPeak: 108, won: true };
  const oppName = useAppStore((s) => s.currentMatch?.opponent.name) ?? '상대';
  const won = result.won;

  const titleAnim = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.6)).current;
  const meBarAnim = useRef(new Animated.Value(0)).current;
  const oppBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleScale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
      Animated.timing(titleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(meBarAnim, {
        toValue: result.mePeak / 140,
        duration: 900,
        useNativeDriver: false,
      }).start();
      Animated.timing(oppBarAnim, {
        toValue: result.oppPeak / 140,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }, 400);
  }, []);

  const delta = Math.abs(result.mePeak - result.oppPeak).toFixed(1);

  return (
    <StageBg>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Animated.View style={[styles.titleWrap, { opacity: titleAnim, transform: [{ scale: titleScale }] }]}>
          <Text style={styles.roundLabel}>라운드 종료</Text>
          <Text style={[styles.resultTitle, {
            color: won ? C.lime : C.pink,
            textShadowColor: won ? C.lime : C.pink,
            textShadowRadius: 32,
            textShadowOffset: { width: 0, height: 0 },
          }]}>
            {won ? 'WIN!' : 'LOSE'}
          </Text>
          {won && <Text style={styles.xpLabel}>⚡ +120 XP · 🏆 +1승</Text>}
        </Animated.View>

        {/* Delta */}
        <View style={styles.deltaWrap}>
          <Text style={styles.deltaText}>
            {won ? '+' : '-'}{delta} dB
          </Text>
        </View>

        {/* Result bars */}
        <View style={{ paddingHorizontal: S[6], gap: 12 }}>
          <ResultRow
            name={user.name}
            peak={result.mePeak}
            accent={C.pink}
            winner={won}
            animValue={meBarAnim}
          />
          <ResultRow
            name={oppName}
            peak={result.oppPeak}
            accent={C.cyan}
            winner={!won}
            animValue={oppBarAnim}
          />
        </View>

        {/* Stats */}
        <Row style={styles.statsRow}>
          <StatTile label="시간" value="5.0" unit="s" />
          <StatTile label="내 최고" value={result.mePeak.toFixed(1)} unit="dB" />
          <StatTile label="차이" value={delta} unit="dB" />
        </Row>

        {/* Actions */}
        <View style={styles.actions}>
          <Btn
            full
            size="lg"
            variant={won ? 'yellow' : 'primary'}
            onPress={() => navigation.replace('Matching')}
          >
            한판 더
          </Btn>
          <Row style={{ gap: 8, marginTop: 10 }}>
            <Btn full size="md" variant="ghost" onPress={() => navigation.navigate('Home')}>
              홈으로
            </Btn>
            <Btn full size="md" variant="ghost" onPress={() => {}}>
              공유
            </Btn>
          </Row>
        </View>
      </ScrollView>
    </StageBg>
  );
}

interface ResultRowProps {
  name: string;
  peak: number;
  accent: string;
  winner: boolean;
  animValue: Animated.Value;
}

function ResultRow({ name, peak, accent, winner, animValue }: ResultRowProps) {
  return (
    <View>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Row style={{ gap: 8 }}>
          <Av name={name} size={28} color={accent} />
          <Text style={{ fontFamily: FONTS.headBold, fontSize: FS.sm, color: C.text }}>{name}</Text>
          {winner && <Chip color={C.lime}>승리</Chip>}
        </Row>
        <Row style={{ gap: 4, alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: accent }}>{peak.toFixed(1)}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: FS.xs, color: C.textDim, paddingBottom: 2 }}>dB</Text>
        </Row>
      </Row>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, {
          backgroundColor: accent,
          width: animValue.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
      </View>
    </View>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {unit && <Text style={styles.statUnit}> {unit}</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 60,
    paddingBottom: 40,
    gap: S[5],
  },
  titleWrap: {
    alignItems: 'center',
    paddingHorizontal: S[6],
  },
  roundLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 0,
  },
  resultTitle: {
    fontFamily: FONTS.display,
    fontSize: 76,
    lineHeight: 80,
    marginTop: 8,
  },
  xpLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.yellow,
    marginTop: 10,
  },
  deltaWrap: {
    alignItems: 'center',
  },
  deltaText: {
    fontFamily: FONTS.mono,
    fontSize: FS.xl,
    color: C.textDim,
    letterSpacing: 1,
  },
  statsRow: {
    marginHorizontal: S[6],
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: R.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  statLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 0,
  },
  statValue: {
    fontFamily: FONTS.headBold,
    fontSize: 18,
    color: C.text,
    marginTop: 4,
  },
  statUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textDim,
  },
  barBg: {
    height: 10,
    backgroundColor: C.bgDeep,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 6,
  },
  actions: {
    paddingHorizontal: S[5],
  },
});
