import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Av, Btn, Row, StageBg } from '../../components/ui';
import { C, FONTS, FS, R, S } from '../../theme';
import { useAppStore } from '../../store';
import { useGameStore } from '../../store/gameStore';
import { MOCK_OPPONENT } from '../../types/game';
import type { GameStackParamList } from '../../navigation/types';
import type { OpponentInfo } from '../../types/game';

type Props = NativeStackScreenProps<GameStackParamList, 'MatchFound'>;

export default function MatchFoundScreen({ navigation, route }: Props) {
  const user = useAppStore((s) => s.user);
  const currentMatch = useAppStore((s) => s.currentMatch);
  const startMatch = useAppStore((s) => s.startMatch);
  const storeOpponent = useGameStore((s) => s.opponent);
  const gameStatus = useGameStore((s) => s.status);
  const countdown = useGameStore((s) => s.countdown);
  const finalResult = useGameStore((s) => s.finalResult);
  const sendReady = useGameStore((s) => s.sendReady);
  const disconnectSocket = useGameStore((s) => s.disconnectSocket);
  const routeOpponent = route.params?.opponent;
  const storeRoomCode = useGameStore((s) => s.roomCode);
  const roomCode = route.params?.roomCode ?? storeRoomCode ?? undefined;
  const hasNavigatedToGame = useRef(false);
  const hasHandledFinalResult = useRef(false);
  const opponent = useMemo<OpponentInfo>(() => {
    if (routeOpponent) return routeOpponent;
    if (storeOpponent) return storeOpponent;
    if (currentMatch?.opponent) {
      return {
        id: 100,
        nickname: currentMatch.opponent.name,
        avatarColor: C.cyan,
        profileImageUrl: null,
        bestDb: currentMatch.opponent.bestDb,
      };
    }
    return MOCK_OPPONENT;
  }, [currentMatch?.opponent, routeOpponent, storeOpponent]);

  const [meReady, setMeReady] = useState(false);

  useEffect(() => {
    if (gameStatus !== 'playing' || hasNavigatedToGame.current) return;
    hasNavigatedToGame.current = true;
    startMatch({ name: opponent.nickname, bestDb: opponent.bestDb });
    navigation.replace('Game', { roomCode, opponent });
  }, [gameStatus, navigation, opponent, roomCode, startMatch]);

  useEffect(() => {
    if (!finalResult || hasHandledFinalResult.current) return;
    hasHandledFinalResult.current = true;

    if (finalResult.forfeit && finalResult.rounds.length === 0) {
      navigation.replace('DuelLobby');
      return;
    }

    navigation.replace('GameResult', {
      result: finalResult.result,
      myScore: finalResult.myScore,
      oppScore: finalResult.oppScore,
      rounds: finalResult.rounds,
      forfeit: finalResult.forfeit,
    });
  }, [finalResult, navigation]);

  const statusMessage = countdown !== null
    ? '곧 시작합니다'
    : meReady
        ? '상대방 준비 중...'
        : '서로 준비 완료를 기다려요';

  const handleLeave = () => {
    Alert.alert('나가기', '매치 대기 화면에서 나갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          disconnectSocket();
          navigation.popToTop();
        },
      },
    ]);
  };

  const handleReady = () => {
    setMeReady(true);
    sendReady();
  };

  return (
    <StageBg>
      <SafeAreaView style={styles.safe}>
        <Row style={styles.topBar}>
          <Pressable onPress={handleLeave} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.topTitle}>{roomCode ? `ROOM ${roomCode}` : 'MATCH FOUND'}</Text>
          <View style={styles.closeBtn} />
        </Row>

        <View style={[styles.playerPanel, styles.oppPanel]}>
          <PlayerCard
            label="OPPONENT"
            name={opponent.nickname}
            bestDb={opponent.bestDb}
            avatarColor={opponent.avatarColor}
            profileImageUrl={opponent.profileImageUrl}
            ready={countdown !== null || gameStatus === 'playing'}
            accent={C.cyan}
          />
        </View>

        <View style={styles.vsZone}>
          <Row style={styles.vsRow}>
            <View style={styles.sideLine} />
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.sideLine} />
          </Row>
          <Text style={styles.statusText}>{statusMessage}</Text>
          {countdown !== null && (
            <Text style={styles.countdown}>{countdown === 0 ? 'GO' : countdown}</Text>
          )}
        </View>

        <View style={[styles.playerPanel, styles.mePanel]}>
          <PlayerCard
            label="YOU"
            name={user.name || '나'}
            bestDb={user.bestDb}
            avatarColor={user.avatarColor}
            profileImageUrl={user.profileImageUrl}
            ready={meReady}
            accent={C.pink}
          />
        </View>

        <View style={styles.bottom}>
          <Btn
            variant={meReady ? 'ghost' : 'primary'}
            size="lg"
            full
            disabled={meReady}
            onPress={handleReady}
          >
            {meReady ? '✓ 준비 완료!' : '준비 완료'}
          </Btn>
        </View>
      </SafeAreaView>
    </StageBg>
  );
}

function PlayerCard({
  label,
  name,
  bestDb,
  avatarColor,
  profileImageUrl,
  ready,
  accent,
}: {
  label: string;
  name: string;
  bestDb: number;
  avatarColor: string;
  profileImageUrl: string | null;
  ready: boolean;
  accent: string;
}) {
  return (
    <View style={styles.playerCard}>
      <Av name={name} size={88} color={avatarColor} profileImageUrl={profileImageUrl} ring />
      <Text style={styles.playerLabel}>{label}</Text>
      <Text style={styles.playerName}>{name}</Text>
      <Text style={styles.playerDb}>{bestDb > 0 ? `${bestDb.toFixed(2)}dB` : '기록 없음'}</Text>
      <View style={[styles.readyBadge, { borderColor: ready ? C.lime : `${accent}55`, backgroundColor: ready ? `${C.lime}1a` : `${accent}10` }]}>
        <Text style={[styles.readyText, { color: ready ? C.lime : accent }]}>
          {ready ? '준비 완료' : '준비 전'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingTop: S[1],
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 22,
    color: C.textDim,
  },
  topTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textDim,
  },
  playerPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  oppPanel: {
    borderBottomWidth: 1,
    borderBottomColor: `${C.cyan}22`,
  },
  mePanel: {
    borderTopWidth: 1,
    borderTopColor: `${C.pink}22`,
  },
  playerCard: {
    alignItems: 'center',
    gap: S[2],
  },
  playerLabel: {
    marginTop: S[2],
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  playerName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.xl,
    color: C.text,
  },
  playerDb: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
  },
  readyBadge: {
    marginTop: S[1],
    paddingHorizontal: S[3],
    paddingVertical: 5,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  readyText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },
  vsZone: {
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[5],
  },
  vsRow: {
    width: '100%',
    alignItems: 'center',
    gap: S[4],
  },
  sideLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${C.line}aa`,
    marginBottom: 12,
  },
  vsText: {
    fontFamily: FONTS.display,
    fontSize: 48,
    lineHeight: 64,
    color: C.pink,
  },
  statusText: {
    marginTop: S[3],
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.textDim,
  },
  countdown: {
    position: 'absolute',
    right: S[5],
    bottom: S[2],
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 46,
    color: C.yellow,
  },
  bottom: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
  },
});
