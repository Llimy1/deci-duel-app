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
import { Av, Card, Chip, Row } from '../../components/ui';
import { DbViz } from '../../components/DbViz';
import { useAppStore } from '../../store';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const logout = useAppStore((s) => s.logout);

  const xpForLevel = user.level * 500;
  const xpProgress = user.xp % xpForLevel;
  const xpPct = xpProgress / xpForLevel;

  const stats = [
    { label: '승', value: '47', color: C.lime },
    { label: '패', value: '21', color: C.pink },
    { label: '승률', value: '69%', color: C.cyan },
    { label: '연승', value: `${user.streak}`, color: C.yellow },
  ];

  const links = [
    { label: '업적', screen: 'Achievements' as const },
    { label: '데일리 챌린지', screen: 'DailyChallenge' as const },
    { label: '히스토리', screen: 'History' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Av name={user.name} size={88} color={avatarColor} ring />
          <Text style={styles.userName}>{user.name}</Text>
          <Chip color={C.cyan}>LV.{user.level}</Chip>

          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPct * 100}%` as any }]} />
          </View>
          <Text style={styles.xpText}>{xpProgress} / {xpForLevel} XP</Text>

          <DbViz style="radial" value={user.bestDb} size={120} accent={C.pink} />
          <Text style={styles.bestDbLabel}>최고 {user.bestDb} dB</Text>
        </View>

        <Row style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Row>

        <View style={styles.linkList}>
          {links.map((l) => (
            <Pressable
              key={l.label}
              onPress={() => navigation.navigate(l.screen)}
              style={({ pressed }) => [styles.linkItem, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.linkText}>{l.label}</Text>
              <Text style={styles.linkArrow}>›</Text>
            </Pressable>
          ))}

          <Pressable onPress={logout} style={({ pressed }) => [styles.linkItem, styles.logoutItem, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.linkText, { color: C.pink }]}>로그아웃</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingBottom: S[8],
    gap: S[5],
  },
  hero: {
    alignItems: 'center',
    paddingTop: S[6],
    gap: S[3],
  },
  userName: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
    marginTop: S[2],
    letterSpacing: -0.5,
  },
  xpBarBg: {
    width: 200,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.surface2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: C.purple,
    borderRadius: 3,
  },
  xpText: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
  bestDbLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.xs,
    color: C.pink,
    letterSpacing: 0,
  },
  statsRow: {
    marginHorizontal: S[5],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S[4],
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: S[1],
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: FS.xl,
  },
  statLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  linkList: {
    marginHorizontal: S[5],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  linkText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  linkArrow: {
    fontSize: 20,
    color: C.textMute,
    fontFamily: FONTS.headBold,
  },
});
