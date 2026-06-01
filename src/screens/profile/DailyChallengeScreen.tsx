import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StageBg, Row } from '../../components/ui';
import { C, FONTS, FS, S } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'DailyChallenge'>;

export default function DailyChallengeScreen({ navigation }: Props) {
  return (
    <StageBg>
      <SafeAreaView style={styles.safe}>
        <Row style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>데일리 챌린지</Text>
          <View style={styles.backBtn} />
        </Row>

        <View style={styles.center}>
          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.heading}>랜덤 매칭 이후 업데이트 예정</Text>
          <Text style={styles.sub}>랜덤 매칭이 출시되면{'\n'}매일 새로운 챌린지를 만나볼 수 있어요.</Text>
        </View>
      </SafeAreaView>
    </StageBg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[8],
    gap: S[3],
  },
  emoji: {
    fontSize: 48,
    marginBottom: S[2],
  },
  heading: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
    textAlign: 'center',
  },
  sub: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
});
