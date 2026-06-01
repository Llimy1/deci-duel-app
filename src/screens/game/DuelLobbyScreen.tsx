import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Btn, Row, StageBg } from '../../components/ui';
import CodeBoxes from '../../components/game/CodeBoxes';
import IdlePulse from '../../components/game/IdlePulse';
import { C, FONTS, FS, R, S, gradHot } from '../../theme';
import type { GameStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store';
import { useGameStore } from '../../store/gameStore';
import { Toast } from '../../utils/toast';
import { requireMicPermission } from '../../utils/micPermission';

type Props = NativeStackScreenProps<GameStackParamList, 'DuelLobby'>;
type SheetMode = 'choice' | 'code';

export default function DuelLobbyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const accessToken = useAppStore((s) => s.accessToken);
  const connectSocket = useGameStore((s) => s.connectSocket);
  const createSocketRoom = useGameStore((s) => s.createRoom);
  const joinSocketRoom = useGameStore((s) => s.joinRoom);
  const roomCode = useGameStore((s) => s.roomCode);
  const gameStatus = useGameStore((s) => s.status);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const clearError = useGameStore((s) => s.clearError);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<SheetMode>('choice');
  const [code, setCode] = useState('');
  const slide = useRef(new Animated.Value(0)).current;
  const lastNavigationKey = useRef<string | null>(null);
  // navigation.isFocused() 대신 ref로 포커스 추적 — Modal이 열려있을 때도 정확함
  const isFocusedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      // 포커스 복귀 시 이전 navigate key 초기화 — 같은 roomCode로 재입장 시 navigate 차단 방지
      lastNavigationKey.current = null;
      if (!accessToken) {
        Toast.error('로그인이 필요합니다.');
        navigation.goBack();
        return;
      }
      connectSocket(accessToken);
      return () => {
        isFocusedRef.current = false;
      };
    }, [accessToken, connectSocket, navigation])
  );

  useEffect(() => {
    if (!roomCode) return;
    if (!isFocusedRef.current) return;
    const key = `${gameStatus}:${roomCode}`;
    if (lastNavigationKey.current === key) return;

    if (gameStatus === 'waiting') {
      lastNavigationKey.current = key;
      setSheetOpen(false);
      setCode('');
      navigation.navigate('WaitingRoom', { roomCode });
    }

    if (gameStatus === 'matched') {
      lastNavigationKey.current = key;
      setSheetOpen(false);
      setCode('');
      navigation.navigate('MatchFound', { roomCode });
    }
  }, [gameStatus, navigation, roomCode]);

  useEffect(() => {
    if (!errorMessage || mode !== 'code') return;
    setSheetOpen(true);
    slide.setValue(1);
  }, [errorMessage, mode, slide]);

  const openSheet = () => {
    clearError();
    setMode('choice');
    setSheetOpen(true);
    Animated.timing(slide, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  };

  const closeSheet = () => {
    Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSheetOpen(false);
    });
  };

  const createRoom = async () => {
    const ok = await requireMicPermission();
    if (!ok) return;
    closeSheet();
    createSocketRoom();
  };

  const joinRoom = async () => {
    if (code.length !== 6) return;
    const ok = await requireMicPermission();
    if (!ok) return;
    clearError();
    joinSocketRoom(code);
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });

  return (
    <StageBg>
      <SafeAreaView style={styles.safe}>
        <Row style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.title}>DUEL</Text>
            <Text style={styles.subTitle}>1 · ON · 1</Text>
          </View>
          <View style={styles.backBtn} />
        </Row>

        <View style={styles.hero}>
          <IdlePulse color={C.pink} size={196} />
          <Text style={styles.headline}>외쳐서, 이겨라.</Text>
          <Text style={styles.caption}>랜덤 매칭은 준비 중이에요. 지금은 친구와 방 코드로 먼저 붙어볼 수 있어요.</Text>
        </View>

        <View style={styles.actions}>
          <Pressable disabled style={styles.disabledCta}>
            <View style={styles.badge}><Text style={styles.badgeText}>준비 중</Text></View>
            <Text style={styles.disabledCtaText}>랜덤 매칭 시작</Text>
          </Pressable>
          <Pressable onPress={openSheet} style={({ pressed }) => [styles.friendButton, { opacity: pressed ? 0.75 : 1 }]}>
            <Text style={styles.friendText}>친구와 대결</Text>
            <Text style={styles.friendArrow}>›</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + S[8], transform: [{ translateY }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          {mode === 'choice' ? (
            <>
              <Text style={styles.sheetTitle}>친구와 대결</Text>
              <Text style={styles.sheetSub}>6자리 코드로 같은 방에 입장해요.</Text>
              <FriendAction
                color={C.pink}
                icon="+"
                title="방 만들기"
                sub="새 코드를 만들고 친구를 초대합니다."
                onPress={createRoom}
              />
              <FriendAction
                color={C.cyan}
                icon="#"
                title="코드로 참가"
                sub="친구에게 받은 코드를 입력합니다."
                onPress={() => setMode('code')}
              />
            </>
          ) : (
            <>
              <Row style={styles.sheetHeader}>
                <Pressable onPress={() => setMode('choice')} style={styles.sheetBack}>
                  <Text style={styles.sheetBackText}>‹</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>코드로 참가</Text>
                <View style={styles.sheetBack} />
              </Row>
              <Text style={styles.sheetSub}>친구가 보낸 6자리 방 코드를 입력하세요.</Text>
              <CodeBoxes value={code} onChange={setCode} />
              {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
              <Btn
                variant={code.length === 6 ? 'cyan' : 'ghost'}
                size="lg"
                full
                disabled={code.length !== 6 || gameStatus === 'connecting'}
                onPress={joinRoom}
                style={{ marginTop: S[5] }}
              >
                {gameStatus === 'connecting' ? '참가 중...' : '참가하기'}
              </Btn>
            </>
          )}
        </Animated.View>
      </Modal>
    </StageBg>
  );
}

function FriendAction({
  color,
  icon,
  title,
  sub,
  onPress,
}: {
  color: string;
  icon: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.friendAction, { opacity: pressed ? 0.78 : 1 }]}>
      <LinearGradient colors={[`${color}44`, `${color}10`]} style={styles.actionIcon}>
        <Text style={[styles.actionIconText, { color }]}>{icon}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <Text style={[styles.actionArrow, { color }]}>›</Text>
    </Pressable>
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
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: FONTS.headBold,
    fontSize: 34,
    lineHeight: 36,
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
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[6],
  },
  headline: {
    marginTop: S[6],
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 46,
    color: C.text,
    textAlign: 'center',
  },
  caption: {
    marginTop: S[3],
    maxWidth: 292,
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    lineHeight: 20,
    color: C.textDim,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: S[5],
    paddingBottom: S[8],
    gap: S[3],
  },
  disabledCta: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    borderRadius: R.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${C.textMute}88`,
    backgroundColor: `${C.surface}bb`,
  },
  disabledCtaText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.textMute,
  },
  badge: {
    paddingHorizontal: S[2],
    paddingVertical: 3,
    borderRadius: R.pill,
    backgroundColor: `${C.yellow}1f`,
    borderWidth: 1,
    borderColor: `${C.yellow}55`,
  },
  badgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: C.yellow,
  },
  friendButton: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
  },
  friendText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.cyan,
  },
  friendArrow: {
    fontFamily: FONTS.headBold,
    fontSize: 22,
    color: C.cyan,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: S[5],
    paddingTop: S[3],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: `${C.purple}66`,
    backgroundColor: C.bgElev,
    gap: S[3],
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: `${C.textDim}66`,
    marginBottom: S[2],
  },
  sheetHeader: {
    justifyContent: 'space-between',
  },
  sheetBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackText: {
    fontFamily: FONTS.headBold,
    fontSize: 30,
    color: C.textDim,
  },
  sheetTitle: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
  },
  sheetSub: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.textDim,
    marginBottom: S[2],
  },
  errorText: {
    marginTop: -S[1],
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.pink,
  },
  friendAction: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    padding: S[4],
    borderBottomWidth: 1,
    borderBottomColor: `${C.line}88`,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontFamily: FONTS.headBold,
    fontSize: 22,
    lineHeight: 46,
    textAlignVertical: 'center',
  },
  actionTitle: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  actionSub: {
    marginTop: 4,
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textDim,
  },
  actionArrow: {
    fontFamily: FONTS.headBold,
    fontSize: 24,
  },
});
