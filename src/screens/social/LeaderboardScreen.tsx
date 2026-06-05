import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, FONTS, FS, S, R } from '../../theme';
import { Av, Row } from '../../components/ui';
import { useAppStore } from '../../store';
import { getGlobalLeaderboard } from '../../api/leaderboard';
import type { LeaderboardEntry } from '../../api/leaderboard';

// ─── Medal palette ───────────────────────────────────────────────
const GOLD   = '#FFD700';
const SILVER = '#A8C0D6';
const BRONZE = '#CD7F32';
const MEDAL_COLORS = [GOLD, SILVER, BRONZE] as const;

// Podium display order: 2nd (left) | 1st (center) | 3rd (right)
const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_BASE_H = [44, 68, 30] as const;   // height of podium bases: [2nd, 1st, 3rd]
const PODIUM_AV_SZ  = [60, 76, 56] as const;   // avatar sizes

// ─── Screen ───────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const user = useAppStore((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function fetchData() {
        setLoading(true);
        setError(null);
        try {
          const res = await getGlobalLeaderboard();
          if (cancelled) return;
          if (res.statusCode === 200 && res.data) {
            setEntries(res.data.entries);
            setMyEntry(res.data.myEntry);
          } else {
            setError('리더보드를 불러오지 못했습니다.');
          }
        } catch {
          if (!cancelled) setError('리더보드를 불러오지 못했습니다.');
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchData();
      return () => { cancelled = true; };
    }, [retryToken])
  );

  const top3       = entries.slice(0, 3);
  const rest       = entries.slice(3);
  const showPodium = entries.length >= 1;
  const isMyInTop3 = myEntry !== null && myEntry.rank <= 3;
  const hasRecord  = myEntry !== null && myEntry.bestDb > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>GLOBAL</Text>
        <Text style={styles.headerTitle}>리더보드</Text>
        <View style={styles.headerAccent} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.pink} size="large" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => setRetryToken((t) => t + 1)}
            style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyText}>아직 기록이 없어요{'\n'}첫 번째 주인공이 되어봐요!</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── TOP 3 PODIUM ── */}
          {showPodium && (
            <View style={styles.podiumSection}>
              <Row style={styles.podiumRow}>
                {PODIUM_ORDER.map((entryIdx, displayIdx) => {
                  const entry = top3[entryIdx];
                  if (!entry) return <View key={displayIdx} style={styles.podiumSlot} />;

                  const mColor    = MEDAL_COLORS[entryIdx];
                  const avSize    = PODIUM_AV_SZ[displayIdx];
                  const baseH     = PODIUM_BASE_H[displayIdx];
                  const isCenter  = displayIdx === 1;
                  const isMe      = entry.userId === user.id;

                  return (
                    <View key={entry.userId} style={styles.podiumSlot}>
                      {/* Info above the base */}
                      <View style={styles.podiumInfo}>
                        {isCenter && (
                          <Text style={[styles.podiumCrown, { color: mColor }]}>👑</Text>
                        )}
                        {/* Glowing ring */}
                        <View style={[
                          styles.avRing,
                          {
                            borderColor: isMe ? `${C.pink}cc` : `${mColor}88`,
                            shadowColor: isMe ? C.pink : mColor,
                          },
                        ]}>
                          <Av
                            name={entry.nickname}
                            size={avSize}
                            color={isMe ? C.pink : entry.avatarColor}
                            profileImageUrl={entry.profileImageUrl}
                          />
                        </View>
                        <Text
                          style={[styles.podiumName, isMe && { color: C.pink }]}
                          numberOfLines={1}
                        >
                          {entry.nickname}
                        </Text>
                        {isMe && (
                          <View style={styles.meBadge}>
                            <Text style={styles.meBadgeText}>나</Text>
                          </View>
                        )}
                        <Text style={[styles.podiumDb, { color: entry.bestDb === 0 ? C.textMute : mColor }]}>
                          {entry.bestDb === 0 ? '— dB' : `${entry.bestDb.toFixed(2)} dB`}
                        </Text>
                      </View>

                      {/* Podium base */}
                      <LinearGradient
                        colors={[`${mColor}66`, `${mColor}1a`]}
                        style={[styles.podiumBase, { height: baseH, borderColor: `${mColor}55` }]}
                      >
                        <Text style={[styles.podiumRankLabel, { color: mColor }]}>
                          #{entry.rank}
                        </Text>
                      </LinearGradient>
                    </View>
                  );
                })}
              </Row>
            </View>
          )}

          {/* ── MY RANK CARD (when not in top 3) ── */}
          {!isMyInTop3 && (
            <LinearGradient
              colors={[`${C.pink}22`, `${C.purple}12`]}
              style={styles.myCard}
            >
              <Row style={{ gap: S[3], alignItems: 'center' }}>
                <Text style={styles.myRankNum} numberOfLines={1}>
                  {myEntry ? `#${myEntry.rank}` : '—'}
                </Text>
                <Av
                  name={user.name || '나'}
                  size={44}
                  color={user.avatarColor}
                  ring
                />
                <View style={{ flex: 1 }}>
                  <Row style={{ gap: S[2], alignItems: 'center' }}>
                    <Text style={styles.myName}>{user.name || '나'}</Text>
                    <View style={styles.meBadge}>
                      <Text style={styles.meBadgeText}>나</Text>
                    </View>
                  </Row>
                  <Text style={styles.mySub}>
                    {hasRecord
                      ? `최고 기록  ${myEntry!.bestDb.toFixed(2)} dB`
                      : '아직 솔로 기록이 없어요'}
                  </Text>
                </View>
              </Row>
            </LinearGradient>
          )}

          {/* ── LIST DIVIDER ── */}
          {rest.length > 0 && (
            <Row style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>4위 이하</Text>
              <View style={styles.dividerLine} />
            </Row>
          )}

          {/* ── RANKED LIST (4+) ── */}
          <View style={styles.list}>
            {rest.map((item) => {
              const isMe = item.userId === user.id;
              return (
                <View key={item.userId} style={[styles.listRow, isMe && styles.listRowMe]}>
                  {isMe && <View style={styles.listRowAccent} />}
                  <Text style={[styles.listRank, isMe && { color: C.pink }]}>
                    {item.rank}
                  </Text>
                  <Av
                    name={item.nickname}
                    size={32}
                    color={isMe ? C.pink : item.avatarColor}
                    profileImageUrl={item.profileImageUrl}
                  />
                  <Text
                    style={[styles.listName, isMe && { color: C.pink }]}
                    numberOfLines={1}
                  >
                    {item.nickname}
                  </Text>
                  {isMe && (
                    <View style={styles.meBadge}>
                      <Text style={styles.meBadgeText}>나</Text>
                    </View>
                  )}
                  <Text style={[styles.listDb, item.bestDb === 0 && styles.listDbZero]}>
                    {item.bestDb === 0 ? '— dB' : `${item.bestDb.toFixed(2)} dB`}
                  </Text>
                </View>
              );
            })}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: S[4],
    paddingBottom: S[4],
  },
  headerEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 5,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: FS['2xl'],
    color: C.text,
    marginTop: 4,
  },
  headerAccent: {
    marginTop: S[2],
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.pink,
    // glow
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  // Feedback states
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[3],
    paddingHorizontal: S[6],
  },
  loadingText: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textMute,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.pink,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: S[2],
    paddingHorizontal: S[5],
    paddingVertical: S[2],
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: `${C.pink}66`,
    backgroundColor: `${C.pink}18`,
  },
  retryText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.pink,
    letterSpacing: 0.5,
  },

  // Scroll
  scroll: {
    paddingBottom: S[10],
  },

  // ── Podium ──
  podiumSection: {
    paddingHorizontal: S[3],
    paddingTop: S[2],
  },
  podiumRow: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: S[2],
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumInfo: {
    alignItems: 'center',
    paddingBottom: S[2],
  },
  podiumCrown: {
    fontSize: 24,
    marginBottom: 6,
  },
  avRing: {
    borderRadius: 999,
    borderWidth: 2,
    padding: 3,
    // iOS glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  podiumName: {
    marginTop: 6,
    fontFamily: FONTS.headBold,
    fontSize: 11,
    color: C.text,
    maxWidth: 96,
    textAlign: 'center',
  },
  podiumDb: {
    marginTop: 2,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: R.sm,
    borderTopRightRadius: R.sm,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },

  // ── My card ──
  myCard: {
    marginHorizontal: S[5],
    marginTop: S[4],
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: `${C.pink}44`,
    padding: S[4],
  },
  myRankNum: {
    fontFamily: FONTS.display,
    fontSize: FS['2xl'],
    color: C.pink,
    minWidth: 52,
    textAlign: 'center',
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  myName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  meBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.pill,
    backgroundColor: `${C.pink}22`,
    borderWidth: 1,
    borderColor: `${C.pink}66`,
  },
  meBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: C.pink,
  },
  mySub: {
    marginTop: 3,
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
  },

  // ── Divider ──
  divider: {
    marginHorizontal: S[5],
    marginTop: S[5],
    marginBottom: S[3],
    alignItems: 'center',
    gap: S[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${C.line}66`,
  },
  dividerText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 2,
  },

  // ── List rows ──
  list: {
    paddingHorizontal: S[5],
    gap: S[2],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: 10,
    paddingHorizontal: S[3],
    borderWidth: 1,
    borderColor: `${C.line}88`,
  },
  listRowMe: {
    backgroundColor: `${C.pink}18`,
    borderColor: `${C.pink}55`,
    overflow: 'hidden',
  },
  listRowAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.pink,
    borderTopLeftRadius: R.md,
    borderBottomLeftRadius: R.md,
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  listRank: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
    width: 26,
    textAlign: 'center',
  },
  listName: {
    flex: 1,
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.text,
  },
  listDb: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.cyan,
    letterSpacing: 0.3,
  },
  listDbZero: {
    color: C.textMute,
  },
});
