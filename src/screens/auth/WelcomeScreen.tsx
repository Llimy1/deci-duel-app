import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { C, FONTS, FS, S, R, gradHot } from '../../theme';
import { Btn, Card } from '../../components/ui';
import { useAppStore } from '../../store';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const nickname = useAppStore((s) => s.nickname);
  const setAuth = useAppStore((s) => s.setAuth);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const { height, width } = useWindowDimensions();
  const compact = height < 740;
  const narrow = width < 380;

  const handleStart = () => {
    setAuth(nickname, avatarColor);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[`${C.pink}55`, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>준비 완료 ✓</Text>

        <View style={[styles.headingWrap, compact && styles.headingWrapCompact]}>
          <Text style={[styles.heading, narrow && styles.headingNarrow]}>준비됐어,</Text>
          <LinearGradient
            colors={[...gradHot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientTextWrap}
          >
            <Text
              style={[styles.headingGrad, narrow && styles.headingGradNarrow]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.58}
            >
              {nickname}
            </Text>
          </LinearGradient>
        </View>

        <Card style={styles.tipCard} padding={20}>
          <Text style={styles.tipLabel}>첫 대결 팁</Text>
          <Text style={styles.tipText}>
            조용한 곳보단 친구와 함께! 가장 큰 데시벨을 기록한 사람이 승자야.
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Btn variant="primary" size="xl" full onPress={handleStart}>
          매치 시작 ⚡
        </Btn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: S[5],
    paddingTop: S[10],
    justifyContent: 'center',
    paddingBottom: S[5],
  },
  label: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.pink,
    letterSpacing: 0,
    marginBottom: S[4],
  },
  headingWrap: {
    marginBottom: S[8],
  },
  headingWrapCompact: {
    marginBottom: S[5],
  },
  heading: {
    fontFamily: FONTS.headBold,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.text,
  },
  headingNarrow: {
    fontSize: 44,
    lineHeight: 48,
  },
  gradientTextWrap: {
    borderRadius: R.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: S[2],
  },
  headingGrad: {
    fontFamily: FONTS.headBold,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
    color: C.text,
    backgroundColor: 'transparent',
  },
  headingGradNarrow: {
    fontSize: 44,
    lineHeight: 48,
  },
  tipCard: {
    gap: S[2],
  },
  tipLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
    marginBottom: S[2],
  },
  tipText: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.text,
    lineHeight: 22,
  },
  ctaWrap: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
  },
});
