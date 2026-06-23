import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Btn } from '../../components/ui';
import { MoodEmoji, MoodRow } from '../../components/MoodPicker';
import AudioPlayer from '../../components/AudioPlayer';
import { C, FONTS, FS, R, S } from '../../theme';
import { useDiaryStore } from '../../store/diaryStore';
import type { DiaryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DiaryStackParamList, 'Calendar'>;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MAX_COMMENT = 200;
const FIRST_APP_YEAR = 2026;
const FIRST_APP_MONTH = 4;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function dbColor(db: number): string {
  if (db >= 110) return C.pink;
  if (db >= 90) return C.yellow;
  return C.cyan;
}

export default function CalendarScreen({ navigation }: Props) {
  const now = new Date();
  const { width } = useWindowDimensions();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedMood, setSelectedMood] = useState('😎');
  const entries = useDiaryStore((s) => s.entries);
  const loadEntries = useDiaryStore((s) => s.loadEntries);
  const saveEntry = useDiaryStore((s) => s.saveEntry);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);

  useEffect(() => {
    loadEntries(year, month + 1).catch(() => {});
  }, [loadEntries, month, year]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const isFirstAppMonth = year === FIRST_APP_YEAR && month === FIRST_APP_MONTH;

  const cellGap = 4;
  const sidePad = S[5];
  const cellSize = Math.floor((width - sidePad * 2 - cellGap * 6) / 7);
  const cellHeight = Math.floor(cellSize * 1.18);

  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const prevMonth = () => {
    if (isFirstAppMonth) return;
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const openSoloMeasure = () => {
    const rootNavigation = navigation.getParent()?.getParent();
    if (rootNavigation) {
      (rootNavigation.navigate as any)('SoloMeasure', { diaryMode: true });
      return;
    }
    (navigation.navigate as any)('SoloMeasure', { diaryMode: true });
  };

  // Stats
  const monthEntries = Object.entries(entries).filter(([k]) => {
    const [ey, em] = k.split('-').map(Number);
    return ey === year && em === month + 1;
  }).map(([, v]) => v);

  const daysLogged = monthEntries.length;
  const avgDb = daysLogged > 0
    ? Math.round(monthEntries.reduce((s, e) => s + e.db, 0) / daysLogged)
    : 0;
  const highestDb = daysLogged > 0
    ? Math.max(...monthEntries.map(e => e.db))
    : 0;

  let streak = 0;
  if (year === now.getFullYear() && month === now.getMonth()) {
    for (let d = now.getDate(); d >= 1; d--) {
      if (entries[dateKey(d)]) streak++;
      else break;
    }
  }
  const selectedEntry = selectedDate ? entries[selectedDate] : null;

  const openDetailSheet = (date: string) => {
    const entry = entries[date];
    if (!entry) return;
    setSelectedDate(date);
    setComment(entry.comment);
    setSelectedMood(entry.mood);
    setEditing(false);
  };

  const closeDetailSheet = () => {
    setSelectedDate(null);
    setEditing(false);
  };

  const handleDetailSave = () => {
    if (!selectedEntry) return;
    saveEntry({ ...selectedEntry, mood: selectedMood, comment });
    setEditing(false);
  };

  const handleDelete = () => {
    if (!selectedDate) return;
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteEntry(selectedDate);
          closeDetailSheet();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.title}>다이어리</Text>
          <View style={{ width: 36 }} />
        </View>

        {streak > 0 && (
          <View style={styles.streakRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 이번 달 {streak}일 연속 기록 중</Text>
            </View>
          </View>
        )}

        {/* Month switcher */}
        <View style={styles.monthRow}>
          <Pressable onPress={prevMonth} disabled={isFirstAppMonth} style={[styles.arrowBtn, isFirstAppMonth && { opacity: 0.28 }]}>
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <View style={styles.monthTitleRow}>
            <Text style={styles.monthName}>{MONTH_NAMES[month]}</Text>
            <Text style={styles.monthYear}> {year}</Text>
          </View>
          <Pressable onPress={nextMonth} style={styles.arrowBtn}>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <StatTile label="기록 일수" value={String(daysLogged)} />
          <StatTile label="평균 dB" value={daysLogged > 0 ? String(avgDb) : '—'} />
          <StatTile label="최고 dB" value={daysLogged > 0 ? String(highestDb) : '—'} />
        </View>

        {/* Weekday header */}
        <View style={[styles.weekRow, { paddingHorizontal: sidePad, gap: cellGap }]}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={[styles.weekDay, { width: cellSize, color: i === 0 ? C.pink : C.textMute }]}>{w}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={[styles.grid, { paddingHorizontal: sidePad, gap: cellGap }]}>
          {Array.from({ length: firstDow }).map((_, i) => (
            <View key={`e${i}`} style={{ width: cellSize, height: cellHeight }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dateKey(day);
            const entry = entries[key];
            const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
            const isFuture = new Date(year, month, day) > now;
            const c = entry ? dbColor(entry.db) : null;
            const todayColor = C.lime;

            return (
              <Pressable
                key={day}
                onPress={() => openDetailSheet(key)}
                disabled={!entry}
                style={({ pressed }) => ([
                  styles.cell,
                  { width: cellSize, height: cellHeight },
                  { backgroundColor: entry ? `${c}1a` : isFuture ? 'transparent' : 'rgba(255,255,255,0.02)' },
                  { borderColor: entry ? `${c}cc` : isToday ? todayColor : `${C.line}66` },
                  { borderWidth: entry || isToday ? 2 : 1 },
                  { opacity: isFuture ? 0.3 : 1 },
                  pressed && entry && { opacity: 0.6 },
                ])}
              >
                <Text style={[styles.cellDay, { color: entry ? c! : isToday ? todayColor : C.textMute }]}>{day}</Text>
                {entry && (
                  <>
                    <View style={styles.cellEmojiWrap}>
                      <MoodEmoji emoji={entry.mood} size={22} />
                    </View>
                    <Text style={[styles.cellDb, { color: c! }]}>{entry.db}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[{ c: C.cyan, l: '<90' }, { c: C.yellow, l: '90-110' }, { c: C.pink, l: '110+' }].map(it => (
            <View key={it.l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: it.c, shadowColor: it.c }]} />
              <Text style={styles.legendLabel}>{it.l} dB</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={openSoloMeasure}
      >
        <Text style={styles.fabText}>기록</Text>
      </Pressable>

      <Modal visible={!!selectedEntry} transparent animationType="slide" onRequestClose={closeDetailSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeDetailSheet} />
        <KeyboardAvoidingView
          style={styles.sheetKeyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          {selectedEntry && selectedDate && (
            <View style={styles.detailSheet}>
              <View style={styles.glowPurple} />
              <View style={styles.glowPink} />
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetLabel}>다이어리 기록</Text>
                  <Text style={styles.entryDate}>{selectedDate.replaceAll('-', '.')}</Text>
                </View>
                <Pressable onPress={closeDetailSheet} style={styles.sheetCloseBtn}>
                  <Text style={styles.sheetCloseText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.entryDbRow}>
                <View style={styles.entryEmojiWrap}>
                  <MoodEmoji emoji={editing ? selectedMood : selectedEntry.mood} size={52} />
                </View>
                <View style={styles.entryDbNumWrap}>
                  <Text style={[styles.entryDbValue, { color: dbColor(selectedEntry.db) }]}>{selectedEntry.db}</Text>
                  <Text style={styles.entryDbUnit}>dB</Text>
                </View>
              </View>

              {selectedEntry.audioUri && <AudioPlayer uri={selectedEntry.audioUri} />}

              {editing ? (
                <View style={styles.editWrap}>
                  <MoodRow mood={selectedMood} onSelect={setSelectedMood} />
                  <View style={styles.commentInputWrap}>
                    <TextInput
                      style={styles.commentInput}
                      value={comment}
                      onChangeText={(text) => setComment(text.slice(0, MAX_COMMENT))}
                      placeholder="오늘의 이야기를 적어보세요"
                      placeholderTextColor={C.textMute}
                      maxLength={MAX_COMMENT}
                      multiline
                      textAlignVertical="top"
                      autoFocus
                    />
                    <Text style={styles.commentCounter}>{comment.length}/{MAX_COMMENT}</Text>
                  </View>
                  <Btn variant="primary" size="md" full onPress={handleDetailSave}>저장</Btn>
                </View>
              ) : (
                <ScrollView style={styles.commentScroll}>
                  <Text style={styles.detailComment}>{selectedEntry.comment || '코멘트 없음'}</Text>
                </ScrollView>
              )}

              <View style={styles.detailActions}>
                <View style={styles.detailAction}>
                  <Btn variant="ghost" size="md" full onPress={() => setEditing(true)}>수정</Btn>
                </View>
                <View style={styles.detailAction}>
                  <Btn variant="outline" size="md" full onPress={handleDelete}>삭제</Btn>
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: S[12] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingTop: S[2],
    paddingBottom: S[3],
  },
  streakRow: {
    alignItems: 'center',
    marginBottom: S[3],
  },
  streakBadge: {
    backgroundColor: `${C.lime}1f`,
    borderWidth: 1,
    borderColor: `${C.lime}66`,
    borderRadius: R.pill,
    paddingHorizontal: S[3],
    paddingVertical: 6,
  },
  streakText: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    letterSpacing: 0.5,
    color: C.lime,
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
    letterSpacing: 0.5,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingBottom: S[4],
  },
  arrowBtn: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 25, color: C.textDim, fontFamily: FONTS.headBold },
  monthTitleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  monthName: { fontFamily: FONTS.headBold, fontSize: 28, lineHeight: 32, color: C.text, letterSpacing: -0.5 },
  monthYear: { fontFamily: FONTS.headBold, fontSize: FS.xl, lineHeight: 29, color: C.textDim },
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: S[5],
    gap: S[2],
    marginBottom: S[4],
  },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    padding: S[3],
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 0,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: S[2],
  },
  weekDay: {
    textAlign: 'center',
    fontFamily: FONTS.bodyBold,
    fontSize: FS.xs,
    letterSpacing: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 12,
    gap: 1,
  },
  cellDay: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    position: 'absolute',
    top: 3,
    left: 5,
  },
  cellEmojiWrap: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellDb: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S[4],
    marginTop: S[6],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  legendLabel: { fontFamily: FONTS.mono, fontSize: FS.xs, color: C.textDim },
  fab: {
    position: 'absolute',
    right: S[5],
    bottom: S[6],
    height: 54,
    minWidth: 74,
    borderRadius: 27,
    paddingHorizontal: S[5],
    backgroundColor: C.pink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheetKeyboardWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: C.surfaceElevated,
    borderWidth: 1,
    borderColor: `${C.purple}66`,
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[6],
    gap: S[3],
    overflow: 'hidden',
  },
  glowPurple: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: `${C.purple}33`,
  },
  glowPink: {
    position: 'absolute',
    top: -30,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${C.pink}26`,
  },
  sheetHandle: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: `${C.textDim}99`,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sheetLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    letterSpacing: 0,
    color: C.textMute,
    marginBottom: 4,
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    fontFamily: FONTS.body,
    fontSize: 32,
    lineHeight: 34,
    color: C.textDim,
  },
  entryDate: {
    fontFamily: FONTS.headBold,
    fontSize: FS.xl,
    color: C.text,
  },
  entryDbRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: S[3],
  },
  entryEmojiWrap: {
    height: 52 * 1.2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  entryDbNumWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  entryDbValue: {
    fontFamily: FONTS.headBold,
    fontSize: FS['4xl'],
    lineHeight: 56,
  },
  entryDbUnit: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.md,
    color: C.pink,
  },
  commentScroll: {
    maxHeight: 200,
  },
  detailComment: {
    fontFamily: FONTS.body,
    fontSize: FS.md,
    lineHeight: FS.md * 1.85,
    color: C.textDim,
  },
  editWrap: {
    gap: S[3],
  },
  commentInputWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: R.md,
    padding: S[3],
  },
  commentInput: {
    minHeight: 100,
    maxHeight: 220,
    fontFamily: FONTS.body,
    fontSize: FS.md,
    lineHeight: FS.md * 1.6,
    color: C.text,
    paddingRight: 56,
  },
  commentCounter: {
    position: 'absolute',
    right: S[3],
    bottom: S[3],
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
  detailActions: {
    flexDirection: 'row',
    gap: S[2],
  },
  detailAction: {
    flex: 1,
  },
});
