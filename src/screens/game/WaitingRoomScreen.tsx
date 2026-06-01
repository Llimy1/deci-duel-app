import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Btn, Row, StageBg } from '../../components/ui';
import IdlePulse from '../../components/game/IdlePulse';
import { C, FONTS, FS, R, S } from '../../theme';
import { Toast } from '../../utils/toast';
import type { GameStackParamList } from '../../navigation/types';
import { useGameStore } from '../../store/gameStore';

type Props = NativeStackScreenProps<GameStackParamList, 'WaitingRoom'>;

export default function WaitingRoomScreen({ navigation, route }: Props) {
  const routeRoomCode = route.params.roomCode;
  const storeRoomCode = useGameStore((s) => s.roomCode);
  const gameStatus = useGameStore((s) => s.status);
  const opponent = useGameStore((s) => s.opponent);
  const finalResult = useGameStore((s) => s.finalResult);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const goToWaitingRoom = useGameStore((s) => s.goToWaitingRoom);
  const clearGoToWaitingRoom = useGameStore((s) => s.clearGoToWaitingRoom);
  const roomCode = storeRoomCode ?? routeRoomCode;
  const [elapsed, setElapsed] = useState(0);
  // 프로그래매틱 이탈 여부 추적 — MatchFound로 replace 시 leaveRoom 호출 방지
  const hasNavigatedAway = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 이미 WaitingRoom에 있을 때 goToWaitingRoom 신호 소비 — navigate 없이 플래그만 초기화
  useEffect(() => {
    if (!goToWaitingRoom) return;
    clearGoToWaitingRoom();
    setElapsed(0);
  }, [goToWaitingRoom, clearGoToWaitingRoom]);

  useEffect(() => {
    if (gameStatus !== 'matched' || !opponent) return;
    hasNavigatedAway.current = true;
    navigation.replace('MatchFound', { roomCode, opponent });
  }, [gameStatus, navigation, opponent, roomCode]);

  useEffect(() => {
    if (!finalResult?.forfeit) return;
    hasNavigatedAway.current = true;
    navigation.goBack();
  }, [finalResult, navigation]);

  // 안드로이드 하드웨어 백 버튼 / iOS 스와이프 백 대응
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!hasNavigatedAway.current) {
        leaveRoom();
      }
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  const copyRoomCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    Toast.success('방 코드가 복사되었습니다.');
  };

  const handleCancel = () => {
    hasNavigatedAway.current = true;
    leaveRoom();
    navigation.goBack();
  };

  return (
    <StageBg>
      <SafeAreaView style={styles.safe}>
        <Row style={styles.topBar}>
          <Pressable onPress={handleCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.title}>친구 대결</Text>
            <Text style={styles.subTitle}>WAITING FOR OPPONENT</Text>
          </View>
          <View style={styles.closeBtn} />
        </Row>

        <View style={styles.codeSection}>
          <Row style={styles.codeHeader}>
            <Row style={{ gap: S[2] }}>
              <View style={styles.dot} />
              <Text style={styles.codeLabel}>ROOM CODE</Text>
            </Row>
            <Pressable onPress={copyRoomCode} style={styles.copyBtn}>
              <Text style={styles.copyText}>⧉</Text>
            </Pressable>
          </Row>
          <Text style={styles.roomCode}>{roomCode}</Text>
          <Text style={styles.codeHint}>친구에게 이 코드를 보내면 같은 방으로 입장할 수 있어요.</Text>
        </View>

        <View style={styles.waitCenter}>
          <IdlePulse color={C.cyan} size={180} />
          <Text style={styles.waitTitle}>상대를 기다리는 중...</Text>
          <Text style={styles.waitSub}>{elapsed}s · 친구가 입장하면 자동으로 넘어갑니다</Text>
        </View>

        <View style={styles.bottom}>
          <Btn
            variant="ghost"
            size="lg"
            full
            onPress={handleCancel}
          >
            취소
          </Btn>
        </View>
      </SafeAreaView>
    </StageBg>
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
  topCopy: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
  },
  subTitle: {
    marginTop: 2,
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
  codeSection: {
    marginHorizontal: S[5],
    marginTop: S[5],
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: `${C.cyan}22`,
  },
  codeHeader: {
    justifyContent: 'space-between',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  codeLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.cyan,
  },
  copyBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: `${C.cyan}55`,
    backgroundColor: `${C.cyan}12`,
  },
  copyText: {
    fontSize: 18,
    color: C.cyan,
  },
  roomCode: {
    marginTop: S[4],
    fontFamily: FONTS.display,
    fontSize: 46,
    lineHeight: 60,
    color: C.cyan,
    letterSpacing: 6,
  },
  codeHint: {
    marginTop: S[2],
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    lineHeight: 17,
    color: C.textDim,
  },
  waitCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: S[10],
  },
  waitTitle: {
    marginTop: S[6],
    fontFamily: FONTS.headBold,
    fontSize: FS.xl,
    color: C.text,
  },
  waitSub: {
    marginTop: S[2],
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
  bottom: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
  },
});
