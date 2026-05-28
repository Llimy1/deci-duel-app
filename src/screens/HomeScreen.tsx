import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StageBg, Card, Chip, Av, Btn, Row } from '../components/ui';
import { DbViz } from '../components/DbViz';
import { C, FONTS, FS, R, S, gradHot } from '../theme';
import { useAppStore } from '../store';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const { top } = useSafeAreaInsets();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const waveValue = 108 + Math.sin(tick * 0.3) * 6;

  return (
    <StageBg>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: top + S[3] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Row style={styles.header}>
          <Row style={{ gap: S[2], flex: 1 }}>
            <Av name={user.name} size={36} color={user.avatarColor} profileImageUrl={user.profileImageUrl} ring />
            <View>
              <Text style={styles.greetSub}>안녕,</Text>
              <Text style={styles.greetName}>{user.name}</Text>
            </View>
          </Row>
          <Row style={{ gap: S[2] }}>
            <Chip color={C.yellow}>⚡ {user.streak}d</Chip>
          </Row>
        </Row>

        {/* Wordmark */}
        <View style={styles.wordmarkWrap}>
          <Text style={styles.wordmark}>DECIDUEL</Text>
          <Text style={styles.tagline}>외쳐라 · 측정해라 · 이겨라</Text>
        </View>

        {/* Best dB card */}
        <Card accent={C.pink} style={styles.bestCard} padding={14}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <View>
              <Text style={styles.bestLabel}>최고 기록</Text>
              <Row style={{ alignItems: 'flex-end', gap: S[2] }}>
                <Text style={styles.bestDb}>{user.bestDb.toFixed(2)}</Text>
                <Text style={styles.bestUnit}>dB</Text>
              </Row>
            </View>
            <DbViz style="waveform" value={waveValue} size={90} accent={C.pink} />
          </Row>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(user.bestDb / 140) * 100}%` }]} />
          </View>
        </Card>

        {/* DUEL NOW CTA */}
        <Pressable
          onPress={() => navigation.navigate('DuelLobby')}
          style={({ pressed }) => [styles.duelCard, { opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={gradHot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ position: 'absolute', right: -20, top: -20, opacity: 0.18 }}>
              <DbViz style="radial" value={120} size={180} accent="#fff" />
            </View>
          </View>
          <View>
            <Text style={styles.duelMode}>1 · ON · 1</Text>
            <Text style={styles.duelTitle}>대결 로비</Text>
            <Text style={styles.duelSub}>랜덤 매칭과 친구 대결</Text>
          </View>
          <Text style={styles.duelArrow}>→</Text>
        </Pressable>

        {/* Secondary action */}
        <View style={{ marginHorizontal: S[5] }}>
          <SecondaryCard
            title="솔로 측정"
            sub="내 데시벨 측정"
            color={C.yellow}
            onPress={() => navigation.navigate('SoloMeasure')}
          />
        </View>

        {/* Daily Challenge */}
        <Card style={{ ...styles.challengeCard, backgroundColor: 'rgba(255,255,255,0.03)' }} padding={14}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <Row style={{ gap: S[1] }}>
              <Text style={{ color: C.yellow }}>⚡</Text>
              <Text style={[styles.challengeLabel, { color: C.yellow }]}>데일리 챌린지</Text>
            </Row>
            <Text style={[styles.challengeLabel, { color: C.textDim }]}>14:32:08</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.challengeTitle}>120 dB 5초 유지</Text>
              <Text style={styles.challengeSub}>완료하면 🔥 표시</Text>
            </View>
            <Btn variant="yellow" size="sm" onPress={() => navigation.navigate('Matching')}>도전</Btn>
          </Row>
        </Card>

        <View style={{ height: S[4] }} />
      </ScrollView>
    </StageBg>
  );
}

function SecondaryCard({ title, sub, color, onPress }: {
  title: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        flex: 1, height: 100, borderRadius: 16, padding: 18,
        backgroundColor: `${color}18`,
        borderWidth: 1, borderColor: `${color}66`,
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      }]}
    >
      <Text style={{ fontFamily: FONTS.headBold, fontSize: FS.xl, color, lineHeight: 28 }}>{title}</Text>
      <Text style={{ fontFamily: FONTS.bodySemibold, fontSize: FS.md, color: C.textDim, marginTop: 4 }}>{sub}</Text>
      <Text style={{ position: 'absolute', right: 16, top: '50%', marginTop: -10, color, fontSize: 22 }}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: S[3],
    paddingBottom: S[6],
  },
  header: {
    marginHorizontal: S[5],
    justifyContent: 'space-between',
  },
  greetSub: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 0.5,
  },
  greetName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  wordmarkWrap: {
    alignItems: 'center',
    paddingVertical: S[2],
  },
  wordmark: {
    fontFamily: FONTS.display,
    fontSize: 44,
    letterSpacing: -1.2,
    color: C.pink,
  },
  tagline: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 0,
    marginTop: 4,
  },
  bestCard: {
    marginHorizontal: S[5],
  },
  bestLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bestDb: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 46,
    color: C.yellow,
  },
  bestUnit: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.sm,
    color: C.textDim,
    paddingBottom: 7,
  },
  progressBg: {
    height: 4,
    backgroundColor: C.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 4,
    backgroundColor: C.pink,
  },
  duelCard: {
    marginHorizontal: S[5],
    height: 132,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  duelMode: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.bg,
    letterSpacing: 0.8,
  },
  duelTitle: {
    fontFamily: FONTS.headBold,
    fontSize: 28,
    lineHeight: 34,
    color: C.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  duelSub: {
    fontSize: FS.xs,
    color: C.bg,
    fontFamily: FONTS.bodyBold,
    marginTop: 8,
  },
  duelArrow: {
    fontSize: 24,
    color: C.text,
  },
  challengeCard: {
    marginHorizontal: S[5],
  },
  challengeLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    letterSpacing: 0,
  },
  challengeTitle: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.text,
  },
  challengeSub: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textDim,
    marginTop: 2,
  },
});
