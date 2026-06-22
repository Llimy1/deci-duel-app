import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn } from '../../components/ui';
import { useDiaryStore, DiaryEntry } from '../../store/diaryStore';
import type { DiaryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DiaryStackParamList, 'DayDetail'>;

export default function DayDetailScreen({ navigation, route }: Props) {
  const { date } = route.params;
  const entries = useDiaryStore((s) => s.entries);
  const saveEntry = useDiaryStore((s) => s.saveEntry);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);
  const entry = entries[date] as DiaryEntry | undefined;

  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(entry?.comment ?? '');

  useEffect(() => {
    if (entry) setComment(entry.comment);
  }, [entry]);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.dateText}>{date}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>기록이 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: () => {
          deleteEntry(date);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleSave = () => {
    saveEntry({ ...entry, comment });
    setEditing(false);
  };

  const dbColor = entry.db > 110 ? C.pink : entry.db >= 90 ? C.yellow : C.cyan;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.dateText}>{date}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.moodLarge}>{entry.mood}</Text>

        <View style={styles.dbWrap}>
          <Text style={[styles.dbValue, { color: dbColor }]}>{entry.db}</Text>
          <Text style={styles.dbUnit}>dB</Text>
        </View>

        {editing ? (
          <View style={styles.editWrap}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={(t) => setComment(t.slice(0, 200))}
              placeholder="코멘트 입력"
              placeholderTextColor={C.textMute}
              autoFocus
              maxLength={200}
              multiline
              textAlignVertical="top"
            />
            <Btn variant="primary" size="md" onPress={handleSave}>저장</Btn>
          </View>
        ) : (
          <Text style={styles.commentText}>{entry.comment || '—'}</Text>
        )}

        <View style={styles.btnRow}>
          <Btn variant="ghost" size="md" onPress={() => setEditing(true)} style={{ flex: 1 }}>
            수정
          </Btn>
          <Btn variant="outline" size="md" onPress={handleDelete} style={{ flex: 1 }}>
            삭제
          </Btn>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[2],
  },
  backBtn: {
    padding: S[2],
    width: 40,
  },
  backText: {
    fontSize: 28,
    color: C.textDim,
    fontFamily: FONTS.headBold,
  },
  dateText: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[5],
    gap: S[5],
  },
  moodLarge: {
    fontSize: 80,
  },
  dbWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: S[2],
  },
  dbValue: {
    fontFamily: FONTS.display,
    fontSize: 72,
    lineHeight: 72,
  },
  dbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.xl,
    color: C.textDim,
    paddingBottom: 8,
  },
  commentText: {
    fontFamily: FONTS.body,
    fontSize: FS.lg,
    color: C.textDim,
    textAlign: 'center',
  },
  editWrap: {
    width: '100%',
    gap: S[3],
  },
  commentInput: {
    minHeight: 100,
    maxHeight: 200,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.text,
  },
  btnRow: {
    flexDirection: 'row',
    gap: S[3],
    width: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: FS.lg,
    color: C.textMute,
  },
});
