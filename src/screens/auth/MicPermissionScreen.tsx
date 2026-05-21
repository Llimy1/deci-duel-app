import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn, Card } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'MicPermission'>;

const NUM_COLS = 22;

function DbPreview({ tick }: { tick: number }) {
  return (
    <View style={styles.previewBox}>
      <View style={styles.previewInner}>
        {Array.from({ length: NUM_COLS }).map((_, i) => {
          const phase = i / NUM_COLS;
          const wave = Math.sin(tick * 0.12 + phase * Math.PI * 2) * 0.5 + 0.5;
          const h = wave * 0.75 + 0.1;
          const color = h > 0.78 ? C.pink : h > 0.45 ? C.yellow : C.cyan;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                marginHorizontal: 1.5,
                height: `${Math.min(1, h) * 100}%`,
                backgroundColor: color,
                borderRadius: 3,
                opacity: 0.85,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function MicPermissionScreen({ navigation }: Props) {
  const [tick, setTick] = useState(0);
  const { height, width } = useWindowDimensions();
  const compact = height < 740;
  const narrow = width < 380;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const handleAllow = async () => {
    try {
      await Audio.requestPermissionsAsync();
    } catch {}
    navigation.navigate('Welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.step}>03 / 04</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { minHeight: height * 0.72 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>마이크 권한</Text>
        <Text style={[styles.heading, narrow && styles.headingNarrow]}>{'소리내봐.\n측정할게.'}</Text>
        <Text style={styles.sub}>마이크 권한 없이는 게임이 시작될 수 없어.</Text>

        <View style={compact && styles.previewCompact}>
          <DbPreview tick={tick} />
        </View>

        <Card style={styles.privacyCard} padding={16}>
          <View style={styles.privacyRow}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              녹음 파일은 서버로 전송되지 않아. 측정값(dB)만 기록돼.
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Btn variant="primary" size="xl" full onPress={handleAllow}>
          마이크 허용하기
        </Btn>
        <Text style={styles.refuseNote}>거부하면 게임을 플레이할 수 없어요</Text>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[2],
  },
  backBtn: {
    padding: S[2],
  },
  backText: {
    fontSize: 28,
    color: C.textDim,
    fontFamily: FONTS.headBold,
  },
  step: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  content: {
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[5],
  },
  label: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.pink,
    letterSpacing: 0,
    marginBottom: S[3],
  },
  heading: {
    fontFamily: FONTS.headBold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
    color: C.text,
    marginBottom: S[3],
  },
  headingNarrow: {
    fontSize: 30,
    lineHeight: 38,
  },
  sub: {
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.textDim,
    marginBottom: S[5],
  },
  previewBox: {
    height: 180,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 18,
    marginBottom: S[5],
  },
  previewCompact: {
    transform: [{ scaleY: 0.86 }],
    marginTop: -12,
    marginBottom: -12,
  },
  previewInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  privacyCard: {
    marginBottom: S[3],
  },
  privacyRow: {
    flexDirection: 'row',
    gap: S[3],
    alignItems: 'flex-start',
  },
  lockIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textDim,
    lineHeight: 20,
  },
  ctaWrap: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
    alignItems: 'center',
    gap: S[3],
  },
  refuseNote: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    textAlign: 'center',
  },
});
