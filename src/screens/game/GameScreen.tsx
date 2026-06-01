import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Av, Row, StageBg } from '../../components/ui';
import GameHeader from '../../components/game/GameHeader';
import MiniWaveform from '../../components/game/MiniWaveform';
import { C, FONTS, FS, R, S } from '../../theme';
import { useMicDb } from '../../hooks/useMicDb';
import { useAppStore } from '../../store';
import { useGameStore } from '../../store/gameStore';
import { MOCK_OPPONENT } from '../../types/game';
import type { GameStackParamList } from '../../navigation/types';
import type { OpponentInfo, RoundRecord } from '../../types/game';

const ROUND_SECONDS = 5;
const TOTAL_ROUNDS = 3;
const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<GameStackParamList, 'Game'>;
type Phase =
  | { type: 'countdown'; n: number }
  | { type: 'measuring'; timeLeft: number }
  | { type: 'roundResult'; nextIn: number; record: RoundRecord }
  | { type: 'gameOver' };

export default function GameScreen({ navigation, route }: Props) {
  const { top } = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const storeOpponent = useGameStore((s) => s.opponent);
  const gameStatus = useGameStore((s) => s.status);
  const countdown = useGameStore((s) => s.countdown);
  const storeRound = useGameStore((s) => s.currentRound);
  const storeMyScore = useGameStore((s) => s.myScore);
  const storeOppScore = useGameStore((s) => s.oppScore);
  const storeRoundResult = useGameStore((s) => s.roundResult);
  const finalResult = useGameStore((s) => s.finalResult);
  const opponentDb = useGameStore((s) => s.opponentDb);
  const opponentPeakDb = useGameStore((s) => s.opponentPeakDb);
  const sendRoundDb = useGameStore((s) => s.sendRoundDb);
  const submitRound = useGameStore((s) => s.submitRound);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const disconnectedWaitSecs = useGameStore((s) => s.disconnectedWaitSecs);
  const routeOpponent = route.params?.opponent;
  const opponent = useMemo<OpponentInfo>(() => routeOpponent ?? storeOpponent ?? MOCK_OPPONENT, [routeOpponent, storeOpponent]);

  const mic = useMicDb();
  const [phase, setPhase] = useState<Phase>(
    gameStatus === 'playing'
      ? { type: 'measuring', timeLeft: ROUND_SECONDS }
      : { type: 'countdown', n: countdown ?? 3 }
  );
  const [resultNextIn, setResultNextIn] = useState(2);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const disconnectWasPositiveRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const finalNavigationKey = useRef<string | null>(null);
  const lastDbEmitAt = useRef(0);
  const emitWindowPeak = useRef(0); // 마지막 전송 이후 윈도우 내 peak

  const round = storeRound;
  const myScore = storeMyScore;
  const oppScore = storeOppScore;
  const isGolden = round === TOTAL_ROUNDS && myScore === oppScore;
  const myLiveDb = phase.type === 'measuring' ? mic.db : phase.type === 'roundResult' ? phase.record.myDb : 0;
  const oppLiveDb = phase.type === 'measuring' ? opponentDb : phase.type === 'roundResult' ? phase.record.oppDb : 0;
  const oppPeak = phase.type === 'measuring' ? opponentPeakDb : phase.type === 'roundResult' ? phase.record.oppDb : 0;
  const inLastSeconds = phase.type === 'measuring' && phase.timeLeft <= 1.5;

  useEffect(() => {
    if (gameStatus === 'countdown' && countdown !== null) {
      setPhase({ type: 'countdown', n: countdown });
      return;
    }

    if (gameStatus === 'playing') {
      setPhase({ type: 'measuring', timeLeft: ROUND_SECONDS });
      return;
    }

    if (gameStatus === 'gameOver') {
      setPhase({ type: 'gameOver' });
      return;
    }

    if (gameStatus === 'roundResult' && storeRoundResult) {
      setResultNextIn(2);
      setPhase({ type: 'roundResult', nextIn: 2, record: storeRoundResult });
    }
  }, [countdown, gameStatus, storeRoundResult]);

  useEffect(() => {
    if (phase.type !== 'measuring') return;
    mic.reset();
    lastDbEmitAt.current = 0;
    emitWindowPeak.current = 0;
    let submitted = false;
    let mounted = true;
    let timerId: ReturnType<typeof setInterval> | null = null;

    // mic 시작 성공 후 타이머 시작 — 실제 녹음 시작 시점부터 라운드 시간 계산
    mic.start().then((started) => {
      if (!mounted) return;
      if (!started) {
        Alert.alert(
          '마이크 오류',
          '마이크를 시작할 수 없습니다.\n게임을 나가주세요.',
          [
            {
              text: '나가기',
              style: 'destructive',
              onPress: () => { leaveRoom(); navigation.goBack(); },
            },
          ]
        );
        return;
      }

      const startedAt = Date.now();
      timerId = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        const timeLeft = Math.max(0, Number((ROUND_SECONDS - elapsed).toFixed(1)));
        setPhase((p) => p.type === 'measuring' ? { type: 'measuring', timeLeft } : p);

        if (timeLeft > 0 || submitted) return;
        submitted = true;
        clearInterval(timerId!);
        void mic.stop();
        const peakDb = Number(Math.max(mic.getPeak(), mic.getDb()).toFixed(2));
        submitRound(round, peakDb);
      }, 100);
    });

    return () => {
      mounted = false;
      if (timerId) clearInterval(timerId);
      if (!submitted) void mic.stop();
    };
  }, [mic.getDb, mic.getPeak, mic.reset, mic.start, mic.stop, phase.type, round, submitRound, leaveRoom, navigation]);

  useEffect(() => {
    if (phase.type !== 'measuring') return;
    // 매 tick마다 이 윈도우의 peak 갱신 (전송 여부와 무관)
    emitWindowPeak.current = Math.max(emitWindowPeak.current, mic.db);

    const now = Date.now();
    if (now - lastDbEmitAt.current < 150) return; // 250ms → 150ms, peak 손실 구간 축소
    lastDbEmitAt.current = now;

    // 현재값 대신 윈도우 내 peak를 전송 — 상대방이 실제 최고점을 볼 수 있음
    const peakToSend = emitWindowPeak.current;
    emitWindowPeak.current = 0;
    sendRoundDb(round, Number(peakToSend.toFixed(2)));
  }, [mic.db, phase.type, round, sendRoundDb]);

  useEffect(() => {
    if (phase.type !== 'roundResult' || resultNextIn <= 0) return;
    const timer = setTimeout(() => {
      setResultNextIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase.type, resultNextIn]);

  useEffect(() => {
    if (!finalResult) return;
    const key = `${finalResult.result}:${finalResult.myScore}:${finalResult.oppScore}:${finalResult.rounds.length}:${finalResult.forfeit ? 'forfeit' : 'normal'}`;
    if (finalNavigationKey.current === key) return;
    finalNavigationKey.current = key;
    navigation.replace('GameResult', {
      result: finalResult.result,
      myScore: finalResult.myScore,
      oppScore: finalResult.oppScore,
      rounds: finalResult.rounds,
      forfeit: finalResult.forfeit,
    });
  }, [finalResult, navigation]);

  // 상대방 연결 끊김 카운트다운
  useEffect(() => {
    if (disconnectedWaitSecs === null) {
      setDisconnectCountdown(null);
      disconnectWasPositiveRef.current = false;
      return;
    }
    disconnectWasPositiveRef.current = disconnectedWaitSecs > 0;
    setDisconnectCountdown(disconnectedWaitSecs);
    const id = setInterval(() => {
      setDisconnectCountdown((c) => (c !== null && c > 0 ? c - 1 : c));
    }, 1000);
    return () => clearInterval(id);
  }, [disconnectedWaitSecs]);

  useEffect(() => {
    if (!inLastSeconds) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 180, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 180, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [inLastSeconds, pulse]);

  return (
    <StageBg>
      <View style={[styles.root, { paddingTop: top + S[3] }]}>
        {disconnectCountdown !== null && (
          <View style={styles.disconnectBanner}>
            <Text style={styles.disconnectIcon}>📡</Text>
            <Text style={styles.disconnectText}>
              {disconnectCountdown > 0
                ? `상대방 연결 끊김 · ${disconnectCountdown}초 대기 중...`
                : disconnectWasPositiveRef.current
                  ? '상대방 연결 끊김 · 게임 종료 중...'
                  : '상대방 연결 끊김'}
            </Text>
          </View>
        )}
        <GameHeader round={round} myScore={myScore} oppScore={oppScore} isGolden={isGolden} total={TOTAL_ROUNDS} />
        {phase.type === 'countdown' && <CountdownPhase n={phase.n} isGolden={isGolden} />}
        {phase.type === 'measuring' && (
          <MeasuringPhase
            userName={user.name || '나'}
            userAvatarColor={user.avatarColor}
            userImage={user.profileImageUrl}
            opponent={opponent}
            myDb={myLiveDb}
            myPeak={mic.peak}
            oppDb={oppLiveDb}
            oppPeak={oppPeak}
            timeLeft={phase.timeLeft}
            pulse={pulse}
          />
        )}
        {phase.type === 'roundResult' && (
          <RoundResultPhase
            record={phase.record}
            nextIn={resultNextIn}
            myName={user.name || '나'}
            opponent={opponent}
          />
        )}
      </View>
    </StageBg>
  );
}

function CountdownPhase({ n, isGolden }: { n: number; isGolden: boolean }) {
  const color = n === 3 ? C.cyan : n === 2 ? C.yellow : n === 1 ? C.pink : C.lime;
  const label = n === 3 ? '준비' : n === 2 ? '숨 들이쉬고' : n === 1 ? '폐 가득' : 'SHOUT!';

  return (
    <View style={styles.countdownWrap}>
      <View style={[styles.radialGlow, { backgroundColor: `${color}26` }]} />
      {isGolden && <Text style={styles.goldenText}>GOLDEN ROUND</Text>}
      <Text style={styles.countLabel}>{label}</Text>
      <Text style={[styles.countNumber, { color }, n === 0 && styles.goText]}>{n === 0 ? 'GO' : n}</Text>
      <View style={styles.micChip}><Text style={styles.micChipText}>MIC LIVE</Text></View>
    </View>
  );
}

function MeasuringPhase({
  userName,
  userAvatarColor,
  userImage,
  opponent,
  myDb,
  myPeak,
  oppDb,
  oppPeak,
  timeLeft,
  pulse,
}: {
  userName: string;
  userAvatarColor: string;
  userImage: string | null;
  opponent: OpponentInfo;
  myDb: number;
  myPeak: number;
  oppDb: number;
  oppPeak: number;
  timeLeft: number;
  pulse: Animated.Value;
}) {
  const diff = myDb - oppDb;
  const leading = diff >= 0;
  const timerPct = Math.max(0, Math.min(1, timeLeft / ROUND_SECONDS));
  const timerColor = timeLeft <= 1.5 ? C.yellow : C.pink;

  return (
    <View style={styles.measureWrap}>
      <View style={styles.oppArea}>
        <PlayerLine label="OPP" name={opponent.nickname} avatarColor={opponent.avatarColor} image={opponent.profileImageUrl} accent={C.cyan} />
        <MiniWaveform value={oppDb} width={160} height={48} bars={12} accent={C.cyan} />
        <View style={styles.dbStack}>
          <Text style={styles.oppDb}>{oppDb.toFixed(2)}</Text>
          <Text style={styles.dbUnitLine}>dB</Text>
        </View>
        <Text style={styles.peak}>PEAK {oppPeak.toFixed(2)}</Text>
      </View>

      <View style={styles.leadLine}>
        <Text style={[styles.leadText, { color: leading ? C.lime : C.pink }]}>
          {leading ? '+' : '-'}{Math.abs(diff).toFixed(1)} {leading ? 'LEADING' : 'BEHIND'}
        </Text>
      </View>

      <View style={styles.myArea}>
        <PlayerLine label="YOU" name={userName} avatarColor={userAvatarColor} image={userImage} accent={C.pink} />
        <MiniWaveform value={myDb} width={Math.min(240, width - 72)} height={82} bars={20} accent={C.pink} />
        <Animated.View
          style={{
            alignItems: 'center',
            transform: [{ scale: pulse }],
          }}
        >
          <Text style={styles.myDb}>{myDb.toFixed(2)}</Text>
          <Text style={styles.dbUnitLine}>dB</Text>
        </Animated.View>
        <Text style={styles.peak}>PEAK {myPeak.toFixed(2)}</Text>
      </View>

      <View style={styles.timerBlock}>
        <Row style={styles.timerMeta}>
          <Text style={styles.timerLabel}>TIME LEFT</Text>
          <Text style={[styles.timerSec, { color: timerColor }]}>{timeLeft.toFixed(1)}s</Text>
        </Row>
        <View style={styles.timerTrack}>
          <LinearGradient
            colors={timeLeft <= 1.5 ? [C.yellow, C.pink] : [C.cyan, C.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.timerFill, { width: `${timerPct * 100}%` }]}
          />
        </View>
      </View>
    </View>
  );
}

function PlayerLine({
  label,
  name,
  avatarColor,
  image,
  accent,
}: {
  label: string;
  name: string;
  avatarColor: string;
  image: string | null;
  accent: string;
}) {
  return (
    <Row style={styles.playerLine}>
      <Av name={name} size={28} color={avatarColor} profileImageUrl={image} ring />
      <Text style={styles.playerName}>{name}</Text>
      <Text style={[styles.playerTagText, { color: accent }]}>{label}</Text>
    </Row>
  );
}

function RoundResultPhase({
  record,
  nextIn,
  myName,
  opponent,
}: {
  record: RoundRecord;
  nextIn: number;
  myName: string;
  opponent: OpponentInfo;
}) {
  const won = record.result === 'win';
  const color = record.result === 'draw' ? C.yellow : won ? C.lime : C.pink;
  const title = record.result === 'draw' ? 'DRAW' : won ? 'WIN' : 'LOSE';
  const diff = Math.abs(record.myDb - record.oppDb).toFixed(2);

  return (
    <View style={styles.resultWrap}>
      <Text style={styles.resultLabel}>ROUND {record.round} RESULT</Text>
      <Text style={[styles.roundTitle, { color }]}>{title}</Text>
      <ResultBar name={myName} role="YOU" db={record.myDb} color={C.pink} winner={record.result === 'win'} />
      <ResultBar name={opponent.nickname} role="OPP" db={record.oppDb} color={C.cyan} winner={record.result === 'lose'} />
      <View style={styles.diffLine}>
        <Text style={styles.diffText}>{diff}dB 차이로 결정</Text>
      </View>
      <View style={styles.nextBlock}>
        <Text style={styles.nextLabel}>다음 라운드까지</Text>
        <Text style={styles.nextNumber}>{nextIn}</Text>
      </View>
    </View>
  );
}

function ResultBar({
  name,
  role,
  db,
  color,
  winner,
}: {
  name: string;
  role: string;
  db: number;
  color: string;
  winner: boolean;
}) {
  return (
    <View style={[styles.resultBar, winner && { borderWidth: 1, borderColor: `${C.lime}66`, backgroundColor: `${C.lime}0e` }, !winner && { opacity: 0.68 }]}>
      <View style={{ flex: 1 }}>
        <Row style={{ gap: S[2] }}>
          <Text style={styles.resultName}>{name}</Text>
          <Text style={[styles.resultRole, { color }]}>{role}</Text>
          {winner && <Text style={styles.winBadge}>WIN</Text>}
        </Row>
        <View style={styles.resultTrack}>
          <View style={[styles.resultFill, { backgroundColor: color, width: `${Math.min(100, (db / 140) * 100)}%` }]} />
        </View>
      </View>
      <Text style={[styles.resultDb, { color }]}>{db.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  disconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    paddingVertical: S[2],
    paddingHorizontal: S[4],
    marginHorizontal: S[5],
    marginBottom: S[2],
    borderRadius: R.sm,
    backgroundColor: `${C.yellow}22`,
    borderWidth: 1,
    borderColor: `${C.yellow}44`,
  },
  disconnectIcon: {
    fontSize: 13,
  },
  disconnectText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.yellow,
    letterSpacing: 0.3,
  },
  countdownWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  radialGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  goldenText: {
    marginBottom: S[3],
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.yellow,
  },
  countLabel: {
    fontFamily: FONTS.headBold,
    fontSize: FS.xl,
    color: C.textDim,
  },
  countNumber: {
    marginTop: S[3],
    fontFamily: FONTS.display,
    fontSize: 150,
    lineHeight: 188,
  },
  goText: {
    fontSize: 110,
    lineHeight: 138,
  },
  micChip: {
    marginTop: S[4],
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: `${C.lime}66`,
    backgroundColor: `${C.lime}14`,
  },
  micChipText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.lime,
  },
  measureWrap: {
    flex: 1,
    paddingHorizontal: S[5],
    paddingBottom: S[5],
  },
  oppArea: {
    flex: 0.36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myArea: {
    flex: 0.54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerLine: {
    gap: S[2],
    marginBottom: S[2],
  },
  playerName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.text,
  },
  playerTag: {
    paddingHorizontal: S[1],
  },
  playerTagText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
  },
  oppDb: {
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 52,
    color: C.cyan,
  },
  myDb: {
    marginTop: S[2],
    fontFamily: FONTS.display,
    fontSize: 84,
    lineHeight: 104,
    color: C.pink,
  },
  dbStack: {
    alignItems: 'center',
  },
  dbUnitLine: {
    marginTop: -6,
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
  },
  peak: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  leadLine: {
    alignSelf: 'center',
    marginVertical: S[3],
    paddingVertical: S[1],
  },
  leadText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },
  timerBlock: {
    marginTop: S[3],
  },
  timerMeta: {
    justifyContent: 'space-between',
    marginBottom: S[2],
  },
  timerLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  timerSec: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },
  timerTrack: {
    height: 8,
    borderRadius: R.pill,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  timerFill: {
    height: '100%',
    borderRadius: R.pill,
  },
  resultWrap: {
    flex: 1,
    paddingHorizontal: S[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
  },
  roundTitle: {
    marginTop: S[2],
    marginBottom: S[5],
    fontFamily: FONTS.display,
    fontSize: 72,
    lineHeight: 92,
  },
  resultBar: {
    width: '100%',
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    padding: S[4],
    marginBottom: S[3],
    borderRadius: R.lg,
  },
  resultName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  resultRole: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
  },
  winBadge: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.lime,
  },
  resultTrack: {
    marginTop: S[2],
    height: 5,
    borderRadius: R.pill,
    overflow: 'hidden',
    backgroundColor: C.bg,
  },
  resultFill: {
    height: '100%',
  },
  resultDb: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 36,
  },
  diffLine: {
    marginTop: S[2],
    paddingVertical: S[2],
  },
  diffText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.yellow,
  },
  nextBlock: {
    marginTop: S[5],
    alignItems: 'center',
  },
  nextLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
  },
  nextNumber: {
    marginTop: S[1],
    fontFamily: FONTS.display,
    fontSize: 40,
    lineHeight: 52,
    color: C.yellow,
  },
});
