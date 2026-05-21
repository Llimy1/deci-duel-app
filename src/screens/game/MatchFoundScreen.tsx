import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn, Av, Card, Row } from '../../components/ui';
import { useAppStore } from '../../store';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'MatchFound'>;

export default function MatchFoundScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const opponent = useAppStore((s) => s.currentMatch?.opponent);

  if (!opponent) return null;

  const handleReady = () => {
    navigation.navigate('Countdown');
  };

  const handleLeave = () => {
    Alert.alert('나가기', '정말 매치에서 나가시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>매치 성사</Text>
      </View>

      <View style={styles.vsRow}>
        <View style={styles.playerWrap}>
          <Text style={styles.playerRole}>나</Text>
          <Av name={user.name} size={80} color={avatarColor} ring />
          <Text style={styles.playerName}>{user.name}</Text>
          <Text style={styles.playerSub}>최고 {user.bestDb}dB</Text>
          <Text style={styles.playerSub}>LV.{user.level}</Text>
        </View>

        <View style={styles.vsWrap}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.playerWrap}>
          <Text style={styles.playerRole}>상대</Text>
          <Av name={opponent.name} size={80} color={C.cyan} ring />
          <Text style={styles.playerName}>{opponent.name}</Text>
          <Text style={styles.playerSub}>최고 {opponent.bestDb}dB</Text>
          <Text style={styles.playerSub}>LV.{opponent.level}</Text>
        </View>
      </View>

      <Card style={styles.recordCard} padding={16}>
        <Text style={styles.recordLabel}>전적</Text>
        <Text style={styles.recordText}>
          나 <Text style={{ color: C.lime }}>3</Text> — <Text style={{ color: C.pink }}>2</Text> {opponent.name}
        </Text>
      </Card>

      <View style={styles.ctaRow}>
        <Btn variant="ghost" size="lg" onPress={handleLeave} style={{ flex: 1, borderColor: C.textMute }}>
          나가기
        </Btn>
        <Btn variant="primary" size="lg" onPress={handleReady} style={{ flex: 2 }}>
          준비!
        </Btn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[5],
  },
  banner: {
    marginBottom: S[8],
    paddingHorizontal: S[5],
    paddingVertical: S[2],
    borderRadius: R.pill,
    backgroundColor: `${C.pink}22`,
    borderWidth: 1,
    borderColor: `${C.pink}66`,
  },
  bannerText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.pink,
    letterSpacing: 0,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S[6],
    gap: S[4],
  },
  playerWrap: {
    alignItems: 'center',
    gap: S[2],
    flex: 1,
  },
  playerRole: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  playerName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
    marginTop: S[1],
  },
  playerSub: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textDim,
  },
  vsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontFamily: FONTS.display,
    fontSize: 40,
    color: C.textMute,
  },
  recordCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: S[8],
    gap: S[2],
  },
  recordLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  recordText: {
    fontFamily: FONTS.headBold,
    fontSize: 24,
    color: C.text,
    letterSpacing: -0.3,
  },
  ctaRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
});
