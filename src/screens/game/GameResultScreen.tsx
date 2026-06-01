import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Row, StageBg } from '../../components/ui';
import { C, FONTS, FS, S } from '../../theme';
import type { GameStackParamList } from '../../navigation/types';
import { useGameStore } from '../../store/gameStore';
import { useAppStore } from '../../store';
import { fetchMe } from '../../api/me';

type Props = NativeStackScreenProps<GameStackParamList, 'GameResult'>;

export default function GameResultScreen({ navigation, route }: Props) {
  const { top } = useSafeAreaInsets();
  const { result, myScore, oppScore, rounds, forfeit } = route.params;
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const requestRematch = useGameStore((s) => s.requestRematch);
  const rematchMatchedAt = useGameStore((s) => s.rematchMatchedAt);
  const gameStatus = useGameStore((s) => s.status);
  const roomCode = useGameStore((s) => s.roomCode);
  const opponent = useGameStore((s) => s.opponent);
  const goToWaitingRoom = useGameStore((s) => s.goToWaitingRoom);
  const clearGoToWaitingRoom = useGameStore((s) => s.clearGoToWaitingRoom);
  const setMe = useAppStore((s) => s.setMe);
  // 마운트 시점의 rematchMatchedAt으로 초기화 — 이전 리매치의 잔여값이 즉시 navigation을 유발하는 것 방지
  const handledRematchAt = useRef<number | null>(rematchMatchedAt);
  // 프로그래매틱 이탈 여부 추적 — 홈/리매치 버튼 및 자동 이동 시 beforeRemove leaveRoom 방지
  const hasNavigatedAway = useRef(false);
  const color = result === 'win' ? C.lime : result === 'lose' ? C.pink : C.yellow;
  const label = result === 'win' ? 'WIN' : result === 'lose' ? 'LOSE' : 'DRAW';

  useEffect(() => {
    fetchMe().then(setMe).catch(() => {});
  }, [setMe]);

  useEffect(() => {
    if (!rematchMatchedAt || handledRematchAt.current === rematchMatchedAt) return;
    handledRematchAt.current = rematchMatchedAt;
    hasNavigatedAway.current = true;
    navigation.replace('MatchFound', { roomCode: roomCode ?? undefined, opponent: opponent ?? undefined });
  }, [navigation, opponent, rematchMatchedAt, roomCode]);

  useEffect(() => {
    if (!goToWaitingRoom || !roomCode) return;
    clearGoToWaitingRoom();
    hasNavigatedAway.current = true;
    navigation.replace('WaitingRoom', { roomCode });
  }, [goToWaitingRoom, clearGoToWaitingRoom, navigation, roomCode]);

  // 안드로이드 하드웨어 백 버튼 / iOS 스와이프 백 대응
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!hasNavigatedAway.current) {
        leaveRoom();
      }
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  const restartDuel = () => {
    requestRematch();
  };

  const goHome = () => {
    hasNavigatedAway.current = true;
    leaveRoom();
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
          <Btn
            variant="primary"
            size="lg"
            full
            disabled={gameStatus === 'rematchWaiting'}
            onPress={restartDuel}
          >
            {gameStatus === 'rematchWaiting'
              ? '상대 응답 대기 중'
              : '다시 대결'}
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
