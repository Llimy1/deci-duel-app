import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Achievements'>;

interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

const BADGES: Badge[] = [
  { id: '1', emoji: '🔥', name: '첫 승리', desc: '첫 번째 매치 승리', unlocked: true },
  { id: '2', emoji: '⚡', name: '연승왕', desc: '3연승 달성', unlocked: true },
  { id: '3', emoji: '🏆', name: '챔피언', desc: '10승 달성', unlocked: true },
  { id: '4', emoji: '🎤', name: '소리꾼', desc: '120dB 이상 달성', unlocked: false },
  { id: '5', emoji: '💪', name: '강자', desc: '50승 달성', unlocked: false },
  { id: '6', emoji: '🌟', name: '레전드', desc: '130dB 이상 달성', unlocked: false },
  { id: '7', emoji: '👑', name: '킹', desc: '100승 달성', unlocked: false },
  { id: '8', emoji: '🎵', name: '음악가', desc: '7일 연속 기록', unlocked: true },
  { id: '9', emoji: '🚀', name: '로켓', desc: '레벨 10 달성', unlocked: false },
];

export default function AchievementsScreen({ navigation }: Props) {
  const unlockedCount = BADGES.filter((b) => b.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>업적</Text>
        <Text style={styles.count}>{unlockedCount}/{BADGES.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {BADGES.map((badge) => (
          <View key={badge.id} style={[styles.badge, !badge.unlocked && styles.badgeLocked]}>
            <Text style={[styles.badgeEmoji, !badge.unlocked && styles.badgeEmojiLocked]}>
              {badge.unlocked ? badge.emoji : '🔒'}
            </Text>
            <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
              {badge.name}
            </Text>
            <Text style={styles.badgeDesc}>{badge.desc}</Text>
          </View>
        ))}
      </ScrollView>
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
    flex: 1,
    letterSpacing: -0.5,
  },
  count: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textMute,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: S[4],
    gap: S[3],
    paddingBottom: S[6],
  },
  badge: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S[2],
    gap: 4,
  },
  badgeLocked: {
    opacity: 0.4,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeEmojiLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.xs,
    color: C.text,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: C.textMute,
  },
  badgeDesc: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    textAlign: 'center',
  },
});
