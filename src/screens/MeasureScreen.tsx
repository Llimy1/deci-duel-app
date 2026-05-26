import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, StyleSheet, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DbViz } from '../components/DbViz';
import { Av } from '../components/ui';
import { C, FONTS, FS, S } from '../theme';
import { useMicDb, useSimDb } from '../hooks/useMicDb';
import { useAppStore } from '../store';
import type { RootStackParamList } from '../navigation/types';

const { height } = Dimensions.get('window');
const ROUND_DURATION = 5.0;

type Props = NativeStackScreenProps<RootStackParamList, 'Measure'>;

export default function MeasureScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const setLastResult = useAppStore((s) => s.setLastResult);
  const updateBestDb = useAppStore((s) => s.updateBestDb);
  const currentMatch = useAppStore((s) => s.currentMatch);
  const nextRound = useAppStore((s) => s.nextRound);
  const clearMatch = useAppStore((s) => s.clearMatch);
  const opponent = currentMatch?.opponent ?? { name: '상대', bestDb: 100 };

  const [timer, setTimer] = useState(ROUND_DURATION);
  const [done, setDone] = useState(false);

  const mic = useMicDb();
  const opp = useSimDb('duel-opp', true);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    mic.start();
  }, []);

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTimer((t) => Math.max(0, parseFloat((t - 0.1).toFixed(1))));
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Pulse timer when < 1.5s
  useEffect(() => {
    if (timer < 1.5 && timer > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(timerAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
          Animated.timing(timerAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [timer < 1.5]);

  // Round end
  useEffect(() => {
    if (timer <= 0 && !done) {
      setDone(true);
      mic.stop();
      opp.stop();
      // Flash effect
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();

      const won = mic.peak > opp.peak;
      setLastResult({ mePeak: mic.peak, oppPeak: opp.peak, won });
      updateBestDb(mic.peak);

      const round = currentMatch?.round ?? 1;
      const meScore = (currentMatch?.meScore ?? 0) + (won ? 1 : 0);
      const oppScore = (currentMatch?.oppScore ?? 0) + (won ? 0 : 1);

      if (round >= 3) {
        clearMatch();
        setTimeout(() => navigation.replace('Result'), 700);
      } else {
        nextRound(won);
        setTimeout(() => navigation.replace('RoundBreak', { round, meScore, oppScore }), 700);
      }
    }
  }, [timer]);

  const winning = mic.db > opp.db;
  const timerColor = timer < 1.5 ? C.yellow : C.text;

  return (
    <View style={styles.root}>
      {/* Flash overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, {
          backgroundColor: flashAnim.interpolate({
            inputRange: [0, 1], outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)'],
          }),
          zIndex: 100,
          pointerEvents: 'none',
        } as any]}
      />

      {/* TOP — Opponent (flipped 180°) */}
      <View style={[styles.half, styles.topHalf]}>
        <Animated.View style={{ transform: [{ rotate: '180deg' }] }}>
          <DuelHalf
            name={opponent.name}
            db={opp.db}
            peak={opp.peak}
            accent={C.cyan}
            size={height * 0.22}
          />
        </Animated.View>
      </View>

      {/* CENTER divider with timer */}
      <View style={styles.divider}>
        <View style={[styles.scoreChip, { borderColor: winning ? C.lime : C.line }]}>
          <Text style={[styles.scoreText, { color: winning ? C.lime : C.textDim }]}>
            {mic.db.toFixed(1)} vs {opp.db.toFixed(1)}
          </Text>
        </View>

        <Animated.View style={[styles.timerChip, {
          borderColor: timer < 1.5 ? C.yellow : C.line,
          transform: [{ scale: timerAnim }],
        }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>
            {timer.toFixed(1)}
          </Text>
        </Animated.View>

        <View style={[styles.roundChip, { borderColor: C.pink }]}>
          <Text style={[styles.scoreText, { color: C.pink }]}>R1/3</Text>
        </View>
      </View>

      {/* BOTTOM — You */}
      <View style={[styles.half, styles.bottomHalf]}>
        <DuelHalf
          name={user.name}
          db={mic.db}
          peak={mic.peak}
          accent={C.pink}
          size={height * 0.22}
        />
        {mic.hasPermission === false && (
          <Text style={styles.permError}>⚠ 마이크 권한이 필요합니다</Text>
        )}
      </View>
    </View>
  );
}

interface DuelHalfProps {
  name: string;
  db: number;
  peak: number;
  accent: string;
  size: number;
}

function DuelHalf({ name, db, peak, accent, size }: DuelHalfProps) {
  return (
    <View style={styles.duelHalf}>
      <View style={styles.nameRow}>
        <Av name={name} size={28} color={accent} />
        <Text style={styles.playerName}>{name}</Text>
      </View>
      <DbViz style="radial" value={db} size={size} accent={accent} />
      <Text style={[styles.dbNumber, {
        color: accent,
        textShadowColor: accent,
        textShadowRadius: db > 100 ? 24 : 12,
        textShadowOffset: { width: 0, height: 0 },
      }]}>
        {db.toFixed(1)}
        <Text style={styles.dbUnit}> dB</Text>
      </Text>
      <Text style={styles.peakLabel}>최고 {peak.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  half: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[5],
  },
  topHalf: {
    borderBottomWidth: 2,
    borderBottomColor: C.line,
    backgroundColor: `${C.cyan}11`,
  },
  bottomHalf: {
    backgroundColor: `${C.pink}11`,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    backgroundColor: C.bg,
    zIndex: 10,
  },
  scoreChip: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },
  timerChip: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  timerText: {
    fontFamily: FONTS.display,
    fontSize: 28,
  },
  roundChip: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  duelHalf: {
    alignItems: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  playerName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.text,
  },
  dbNumber: {
    fontFamily: FONTS.display,
    fontSize: FS['4xl'],
    lineHeight: 60,
  },
  dbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.md,
    color: C.textDim,
  },
  peakLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
    marginTop: 2,
  },
  permError: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.yellow,
    marginTop: S[2],
    textAlign: 'center',
  },
});
