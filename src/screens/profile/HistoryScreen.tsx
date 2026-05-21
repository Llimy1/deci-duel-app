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
import { Av, Chip, Row } from '../../components/ui';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'History'>;

interface MatchRecord {
  id: string;
  opponent: string;
  won: boolean;
  myDb: number;
  oppDb: number;
  timeAgo: string;
}

const HISTORY: MatchRecord[] = [
  { id: '1', opponent: '지민', won: true, myDb: 118, oppDb: 112, timeAgo: '방금 전' },
  { id: '2', opponent: '소리왕', won: false, myDb: 115, oppDb: 138, timeAgo: '10분 전' },
  { id: '3', opponent: '철수', won: true, myDb: 120, oppDb: 108, timeAgo: '1시간 전' },
  { id: '4', opponent: '나무', won: true, myDb: 117, oppDb: 110, timeAgo: '2시간 전' },
  { id: '5', opponent: '드래곤', won: false, myDb: 112, oppDb: 124, timeAgo: '어제' },
  { id: '6', opponent: 'LOUD', won: true, myDb: 119, oppDb: 114, timeAgo: '어제' },
  { id: '7', opponent: '데시범', won: true, myDb: 116, oppDb: 109, timeAgo: '2일 전' },
];

export default function HistoryScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>히스토리</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {HISTORY.map((record) => (
          <View key={record.id} style={styles.matchItem}>
            <Av name={record.opponent} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.oppName}>{record.opponent}</Text>
              <Text style={styles.timeAgo}>{record.timeAgo}</Text>
            </View>
            <View style={styles.rightSide}>
              <Chip color={record.won ? C.lime : C.pink}>
                {record.won ? 'WIN' : 'LOSS'}
              </Chip>
              <Text style={styles.dbScore}>
                <Text style={{ color: record.won ? C.lime : C.pink }}>{record.myDb}</Text>
                {' / '}
                <Text style={{ color: C.textMute }}>{record.oppDb}</Text>
                {' dB'}
              </Text>
            </View>
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
    letterSpacing: -0.5,
  },
  list: {
    paddingHorizontal: S[5],
    gap: S[2],
    paddingBottom: S[6],
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S[3],
    borderWidth: 1,
    borderColor: C.line,
  },
  oppName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  timeAgo: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    marginTop: 2,
  },
  rightSide: {
    alignItems: 'flex-end',
    gap: S[1],
  },
  dbScore: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textDim,
  },
});
