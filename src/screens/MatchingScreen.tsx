import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, Easing, Pressable, StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StageBg, Av, Row } from '../components/ui';
import { C, FONTS, FS, S, gradHot } from '../theme';
import { useAppStore } from '../store';
import type { Opponent } from '../store';
import { MOCK_OPPONENT } from '../types/game';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Matching'>;

export default function MatchingScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const startMatch = useAppStore((s) => s.startMatch);
  const [phase, setPhase] = useState<'searching' | 'found'>('searching');
  const [opp, setOpp] = useState<Opponent | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const vsAnim = useRef(new Animated.Value(0)).current;
  const oppAnim = useRef(new Animated.Value(0)).current;

  // Spin animation for dashed circle
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();
  }, []);

  // Mock match flow: found at 2.4s, navigate to MatchFound at 4.2s
  useEffect(() => {
    const mockOpp: Opponent = { name: '지민', bestDb: 124 };
    const t1 = setTimeout(() => {
      setOpp(mockOpp);
      setPhase('found');
      Animated.spring(oppAnim, {
        toValue: 1, tension: 80, friction: 5, useNativeDriver: true,
      }).start();
    }, 2400);
    const t2 = setTimeout(() => {
      startMatch(mockOpp);
      navigation.replace('MatchFound', { opponent: MOCK_OPPONENT });
    }, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <StageBg>
      {/* Close */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.closeBtn}
      >
        <Text style={{ fontSize: 22, color: C.textDim }}>✕</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.phaseLabel}>
          {phase === 'searching' ? '상대 탐색 중' : '상대 발견!'}
        </Text>
        <Text style={styles.phaseTitle}>
          {phase === 'searching' ? '매칭 중...' : '준비!'}
        </Text>

        {/* You */}
        <View style={styles.avatarWrap}>
          <Av name={user.name} size={84} color={user.avatarColor} profileImageUrl={user.profileImageUrl} ring />
          <Text style={styles.playerName}>{user.name}</Text>
          <Text style={styles.playerSub}>최고 {user.bestDb}dB</Text>
        </View>

        {/* VS */}
        <Text style={[styles.vs, phase === 'found' && { color: C.pink }]}>VS</Text>

        {/* Opponent */}
        {phase === 'searching' ? (
          <View style={styles.avatarWrap}>
            <Animated.View style={[styles.dashCircle, { transform: [{ rotate: spin }] }]} />
            <Text style={styles.playerName}>?????</Text>
          </View>
        ) : (
          <Animated.View style={[styles.avatarWrap, {
            opacity: oppAnim,
            transform: [{ scale: oppAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }]}>
            <Av name={opp!.name} size={84} color={C.cyan} ring />
            <Text style={styles.playerName}>{opp!.name}</Text>
            <Text style={styles.playerSub}>최고 {opp!.bestDb}dB 🇰🇷</Text>
          </Animated.View>
        )}

        {/* Status hint */}
        <Text style={styles.hint}>
          {phase === 'found' ? '곧 시작됩니다...' : '서버 핑 12ms · 글로벌 매칭'}
        </Text>
      </View>

      {/* Cancel */}
      <Pressable onPress={() => navigation.goBack()} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>매칭 취소</Text>
      </Pressable>
    </StageBg>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute', top: 52, right: 20,
    padding: 8, zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[6],
    paddingTop: S[8],
  },
  phaseLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.cyan,
    letterSpacing: 0,
  },
  phaseTitle: {
    fontFamily: FONTS.headBold,
    fontSize: 28,
    color: C.text,
    marginTop: 6,
    marginBottom: S[8],
    letterSpacing: -0.5,
  },
  avatarWrap: {
    alignItems: 'center',
    gap: 10,
  },
  playerName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
    marginTop: S[2],
  },
  playerSub: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textDim,
  },
  vs: {
    fontFamily: FONTS.display,
    fontSize: 56,
    color: C.textMute,
    marginVertical: S[5],
  },
  dashCircle: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 2, borderStyle: 'dashed',
    borderColor: C.textMute,
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
    marginTop: S[10],
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: S[4],
    paddingHorizontal: S[6],
    marginBottom: S[10],
  },
  cancelText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.textDim,
    textDecorationLine: 'underline',
  },
});
