import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Row, StageBg } from '../../components/ui';
import { C, FONTS, FS, R, S } from '../../theme';
import type { GameStackParamList } from '../../navigation/types';
import { useGameStore } from '../../store/gameStore';
import { useAppStore } from '../../store';
import { fetchMe } from '../../api/me';

type Props = NativeStackScreenProps<GameStackParamList, 'GameResult'>;

export default function GameResultScreen({ navigation, route }: Props) {
  const { top } = useSafeAreaInsets();
  const { result, myScore, oppScore, rounds, forfeit } = route.params;
  const disconnectSocket = useGameStore((s) => s.disconnectSocket);
  const setMe = useAppStore((s) => s.setMe);
  const color = result === 'win' ? C.lime : result === 'lose' ? C.pink : C.yellow;
  const label = result === 'win' ? 'WIN' : result === 'lose' ? 'LOSE' : 'DRAW';

  useEffect(() => {
    fetchMe().then(setMe).catch(() => {});
  }, [setMe]);

  const restartDuel = () => {
    disconnectSocket();
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'DuelLobby' },
        ],
      })
    );
  };

  const goHome = () => {
    disconnectSocket();
    navigation.popToTop();
  };

  return (
    <StageBg>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: top + S[8] }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.over}>GAME OVER</Text>
          {forfeit && (
            <Text style={[styles.forfeit, { color }]}>
              {result === 'win' ? '상대방 기권으로 승리' : '연결 종료로 패배'}
            </Text>
          )}
          <Text style={[styles.result, { color }]}>{label}</Text>
          <Row style={styles.scoreRow}>
            <Text style={[styles.score, { color: C.pink }]}>{myScore}</Text>
            <Text style={styles.scoreColon}>:</Text>
            <Text style={[styles.score, { color: C.cyan }]}>{oppScore}</Text>
          </Row>
        </View>

        <View style={styles.roundCard}>
          {rounds.map((round, index) => {
            const rColor = round.result === 'win' ? C.lime : round.result === 'lose' ? C.pink : C.yellow;
            return (
              <View key={round.round} style={[styles.roundRow, index === rounds.length - 1 && styles.lastRow]}>
                <View>
                  <Text style={styles.roundLabel}>ROUND {round.round}</Text>
                  <Text style={[styles.roundResult, { color: rColor }]}>{round.result.toUpperCase()}</Text>
                </View>
                <Text style={styles.dbText}>
                  <Text style={{ color: C.pink }}>{round.myDb.toFixed(2)}</Text>
                  <Text style={{ color: C.textMute }}> / </Text>
                  <Text style={{ color: C.cyan }}>{round.oppDb.toFixed(2)}</Text>
                  <Text style={{ color: C.textMute }}> dB</Text>
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Btn variant="primary" size="lg" full onPress={restartDuel}>
            다시 대결
          </Btn>
          <Pressable onPress={goHome} style={styles.homeBtn}>
            <Text style={styles.homeText}>홈으로</Text>
          </Pressable>
        </View>
      </ScrollView>
    </StageBg>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: S[5],
    paddingBottom: S[8],
  },
  hero: {
    alignItems: 'center',
    marginBottom: S[8],
  },
  over: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  forfeit: {
    marginTop: S[3],
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
  },
  result: {
    marginTop: S[3],
    fontFamily: FONTS.display,
    fontSize: 72,
    lineHeight: 92,
  },
  scoreRow: {
    gap: S[4],
    marginTop: S[3],
  },
  score: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 46,
  },
  scoreColon: {
    fontFamily: FONTS.display,
    fontSize: 30,
    lineHeight: 46,
    color: C.textDim,
  },
  roundCard: {
    overflow: 'hidden',
  },
  roundRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  roundLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  roundResult: {
    marginTop: 4,
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
  },
  dbText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.sm,
  },
  actions: {
    marginTop: S[8],
    gap: S[3],
  },
  homeBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.textDim,
  },
});
