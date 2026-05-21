import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONTS, FS, S, R } from '../../theme';
import { Av, Row } from '../../components/ui';
import { useAppStore } from '../../store';

const TABS = ['글로벌', '친구', '주간'] as const;
type Tab = typeof TABS[number];

const MOCK_DATA = [
  { rank: 1, name: '빅보이', bestDb: 138, winRate: 87 },
  { rank: 2, name: '소리왕', bestDb: 136, winRate: 82 },
  { rank: 3, name: 'MEGAPHONE', bestDb: 134, winRate: 79 },
  { rank: 4, name: '지민', bestDb: 124, winRate: 71 },
  { rank: 5, name: '철수', bestDb: 122, winRate: 68 },
  { rank: 6, name: '나무', bestDb: 119, winRate: 63 },
  { rank: 7, name: '드래곤', bestDb: 117, winRate: 60 },
  { rank: 8, name: '재민', bestDb: 118, winRate: 58 },
  { rank: 9, name: '조용이', bestDb: 115, winRate: 54 },
  { rank: 10, name: 'SILENT', bestDb: 112, winRate: 50 },
];

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>('글로벌');
  const user = useAppStore((s) => s.user);

  const myEntry = MOCK_DATA.find((d) => d.name === user.name) ?? {
    rank: 8, name: user.name, bestDb: user.bestDb, winRate: 58,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>리더보드</Text>

      <Row style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </Row>

      <View style={styles.myRankCard}>
        <Row style={{ gap: S[3] }}>
          <Text style={[styles.rankNum, { color: C.pink }]}>#{myEntry.rank}</Text>
          <Av name={myEntry.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{myEntry.name} (나)</Text>
            <Text style={styles.playerSub}>{myEntry.bestDb}dB · 승률 {myEntry.winRate}%</Text>
          </View>
        </Row>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_DATA.map((item) => {
          const rankColor = RANK_COLORS[item.rank];
          return (
            <View key={item.rank} style={styles.listItem}>
              <Text style={[styles.rankNum, rankColor ? { color: rankColor } : { color: C.textMute }]}>
                #{item.rank}
              </Text>
              <Av name={item.name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.playerSub}>승률 {item.winRate}%</Text>
              </View>
              <Text style={styles.dbBadge}>{item.bestDb} dB</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
    paddingHorizontal: S[5],
    paddingTop: S[4],
    marginBottom: S[4],
    letterSpacing: -0.5,
  },
  tabRow: {
    marginHorizontal: S[5],
    backgroundColor: C.surface,
    borderRadius: R.pill,
    padding: 4,
    marginBottom: S[4],
    gap: 2,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: C.pink,
  },
  tabText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.textMute,
  },
  tabTextActive: {
    color: C.text,
  },
  myRankCard: {
    marginHorizontal: S[5],
    marginBottom: S[3],
    backgroundColor: `${C.pink}22`,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: `${C.pink}44`,
    padding: S[4],
  },
  list: {
    paddingHorizontal: S[5],
    gap: S[2],
    paddingBottom: S[6],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S[3],
    borderWidth: 1,
    borderColor: C.line,
  },
  rankNum: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    width: 30,
    textAlign: 'right',
  },
  playerName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.text,
  },
  playerSub: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
  },
  dbBadge: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.cyan,
    letterSpacing: 0.3,
  },
});
