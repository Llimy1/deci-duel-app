import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn, Card } from '../../components/ui';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'DailyChallenge'>;

export default function DailyChallengeScreen({ navigation }: Props) {
  const progress = 0.6;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>데일리 챌린지</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.challengeCard} padding={24}>
          <Text style={styles.dateLabel}>2026년 5월 11일</Text>
          <Text style={styles.challengeEmoji}>🎤</Text>
          <Text style={styles.challengeTitle}>120 dB 5초 유지</Text>
          <Text style={styles.challengeDesc}>
            5초 동안 120dB 이상을 유지해야 해. 폐활량이 중요한 도전!
          </Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardLabel}>보상</Text>
              <Text style={styles.rewardValue}>완료 표시</Text>
            </View>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardLabel}>뱃지</Text>
              <Text style={styles.rewardValue}>🔥 표시</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>진행도</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
          </View>

          <Btn variant="primary" size="xl" full onPress={() => navigation.goBack()}>
            플레이
          </Btn>
        </Card>

        <Text style={styles.resetNote}>⏱ 자정에 초기화됩니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[4],
    gap: S[3],
  },
  backBtn: {
    padding: S[2],
  },
  backText: {
    fontSize: 28,
    color: C.textDim,
    fontFamily: FONTS.headBold,
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: S[5],
    justifyContent: 'center',
    gap: S[4],
  },
  challengeCard: {
    gap: S[4],
    alignItems: 'center',
  },
  dateLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
    alignSelf: 'flex-start',
  },
  challengeEmoji: {
    fontSize: 64,
  },
  challengeTitle: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  challengeDesc: {
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: S[3],
  },
  rewardBadge: {
    flex: 1,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    padding: S[3],
    alignItems: 'center',
    gap: S[1],
    borderWidth: 1,
    borderColor: C.line,
  },
  rewardLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  rewardValue: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.yellow,
  },
  progressSection: {
    width: '100%',
    gap: S[2],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  progressPct: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.cyan,
  },
  progressBg: {
    height: 8,
    backgroundColor: C.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.cyan,
    borderRadius: 4,
  },
  resetNote: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
