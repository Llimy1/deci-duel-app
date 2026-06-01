import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn, Card } from '../../components/ui';
import { useMicDb } from '../../hooks/useMicDb';
import { Toast } from '../../utils/toast';
import { VizScrollWave } from '../../components/DbViz';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'MicTest'>;

type PermStatus = 'checking' | 'granted' | 'denied';

const NUM_COLS = 22;
const FAKE_TICK_MS = 80;

/** 권한 없을 때 보여주는 가짜 파형 애니메이션 */
function FakeWave({ tick }: { tick: number }) {
  return (
    <View style={styles.waveBox}>
      <View style={styles.waveInner}>
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

export default function MicTestScreen({ navigation }: Props) {
  const [permStatus, setPermStatus] = useState<PermStatus>('checking');
  const [testing, setTesting] = useState(false);
  const [tick, setTick] = useState(0);
  const { height, width } = useWindowDimensions();
  const compact = height < 740;
  const narrow = width < 380;
  const waveWidth = width - S[5] * 2 - 36; // 좌우 패딩 + 박스 패딩

  const mic = useMicDb();

  // 가짜 파형 애니메이션 (권한 없거나 테스트 전)
  useEffect(() => {
    if (testing) return;
    const id = setInterval(() => setTick((t) => t + 1), FAKE_TICK_MS);
    return () => clearInterval(id);
  }, [testing]);

  // 화면 진입 시 권한 상태 확인
  useFocusEffect(
    useCallback(() => {
      Audio.getPermissionsAsync().then(({ granted }) => {
        setPermStatus(granted ? 'granted' : 'denied');
      });
      // 화면 이탈 시 테스트 중이면 중단
      return () => {
        if (testing) {
          mic.stop();
          setTesting(false);
        }
      };
    }, [])
  );

  const handleRequestPermission = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      setPermStatus(granted ? 'granted' : 'denied');
    } catch {
      setPermStatus('denied');
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleToggleTest = async () => {
    if (testing) {
      mic.stop();
      setTesting(false);
    } else {
      mic.reset();
      const started = await mic.start();
      if (!started) {
        Toast.error('마이크를 시작할 수 없습니다.');
        return;
      }
      setTesting(true);
    }
  };

  const handleNext = () => {
    if (testing) {
      mic.stop();
      setTesting(false);
    }
    navigation.navigate('Welcome');
  };

  const dbColor = mic.db > 100 ? C.pink : mic.db > 70 ? C.yellow : C.cyan;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.step}>04 / 04</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { minHeight: height * 0.72 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>마이크 테스트</Text>
        <Text style={[styles.heading, narrow && styles.headingNarrow]}>
          {'소리내봐.\n측정할게.'}
        </Text>
        <Text style={styles.sub}>
          {permStatus === 'granted'
            ? '테스트 버튼을 눌러 마이크가 잘 작동하는지 확인해봐.'
            : '게임 플레이를 위해 마이크 권한이 필요해.'}
        </Text>

        {/* 파형 시각화 */}
        <View style={[styles.waveContainer, compact && styles.waveContainerCompact]}>
          {testing ? (
            <View style={styles.waveBox}>
              <VizScrollWave
                value={mic.db}
                width={waveWidth}
                height={compact ? 110 : 144}
                cols={NUM_COLS}
              />
              {/* 실시간 dB 표시 */}
              <View style={styles.dbOverlay}>
                <Text style={[styles.dbNumber, { color: dbColor }]}>
                  {mic.db.toFixed(1)}
                </Text>
                <Text style={styles.dbUnit}>dB</Text>
              </View>
            </View>
          ) : (
            <FakeWave tick={tick} />
          )}
        </View>

        {/* 권한 상태에 따른 UI */}
        {permStatus === 'checking' && (
          <View style={styles.permRow}>
            <Text style={styles.permNote}>권한 확인 중...</Text>
          </View>
        )}

        {permStatus === 'denied' && (
          <View style={styles.permSection}>
            <Card style={styles.deniedCard} padding={16}>
              <View style={styles.deniedRow}>
                <Text style={styles.deniedEmoji}>⚠️</Text>
                <Text style={styles.deniedText}>
                  마이크 권한이 거부됐어. 설정에서 DeciDuel의 마이크를 허용해줘.
                </Text>
              </View>
              <Pressable onPress={handleOpenSettings} style={styles.settingsBtn}>
                <Text style={styles.settingsBtnText}>설정 열기 →</Text>
              </Pressable>
            </Card>
            <Pressable onPress={handleRequestPermission} style={styles.recheckBtn}>
              <Text style={styles.recheckBtnText}>권한 다시 확인</Text>
            </Pressable>
          </View>
        )}

        {permStatus === 'granted' && (
          <>
            {/* 테스트 토글 버튼 */}
            <Pressable
              onPress={handleToggleTest}
              style={[styles.testToggleBtn, testing && styles.testToggleBtnActive]}
            >
              <Text style={[styles.testToggleText, testing && styles.testToggleTextActive]}>
                {testing ? '⏹  테스트 중단' : '▶  테스트 시작'}
              </Text>
            </Pressable>

            {testing && mic.peak > 0 && (
              <View style={styles.peakRow}>
                <Text style={styles.peakLabel}>최고</Text>
                <Text style={styles.peakValue}>{mic.peak.toFixed(1)} dB</Text>
              </View>
            )}
          </>
        )}

        {/* 개인정보 안내 */}
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
        <Btn
          variant={permStatus === 'granted' ? 'primary' : 'ghost'}
          size="xl"
          full
          onPress={permStatus === 'granted' ? handleNext : handleRequestPermission}
        >
          {permStatus === 'granted' ? '다음 →' : '마이크 허용하기'}
        </Btn>
        {permStatus === 'granted' && (
          <Text style={styles.skipNote}>테스트를 건너뛰어도 돼</Text>
        )}
        {permStatus === 'denied' && (
          <Text style={styles.skipNote}>권한 없이도 계속할 수 있어 (게임은 불가)</Text>
        )}
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
  waveContainer: {
    marginBottom: S[5],
  },
  waveContainerCompact: {
    marginBottom: S[3],
  },
  waveBox: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 18,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[3],
  },
  waveInner: {
    width: '100%',
    height: 144,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dbOverlay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  dbNumber: {
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 42,
  },
  dbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    paddingBottom: 6,
  },
  permRow: {
    marginBottom: S[4],
    alignItems: 'center',
  },
  permNote: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textMute,
  },
  permSection: {
    gap: S[3],
    marginBottom: S[4],
  },
  deniedCard: {
    gap: S[3],
  },
  deniedRow: {
    flexDirection: 'row',
    gap: S[3],
    alignItems: 'flex-start',
  },
  deniedEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  deniedText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textDim,
    lineHeight: 20,
  },
  settingsBtn: {
    alignSelf: 'flex-start',
    paddingVertical: S[2],
    paddingHorizontal: S[3],
    borderRadius: R.md,
    backgroundColor: `${C.cyan}18`,
    borderWidth: 1,
    borderColor: `${C.cyan}44`,
  },
  settingsBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.cyan,
  },
  recheckBtn: {
    alignSelf: 'center',
    paddingVertical: S[2],
    paddingHorizontal: S[4],
  },
  recheckBtnText: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textMute,
    textDecorationLine: 'underline',
  },
  testToggleBtn: {
    height: 52,
    borderRadius: R.pill,
    borderWidth: 1.5,
    borderColor: `${C.pink}55`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[4],
    backgroundColor: `${C.pink}0d`,
  },
  testToggleBtnActive: {
    borderColor: C.pink,
    backgroundColor: `${C.pink}1a`,
  },
  testToggleText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.md,
    color: `${C.pink}99`,
  },
  testToggleTextActive: {
    color: C.pink,
  },
  peakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    marginBottom: S[4],
  },
  peakLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 1,
  },
  peakValue: {
    fontFamily: FONTS.display,
    fontSize: FS.lg,
    color: C.yellow,
  },
  privacyCard: {
    marginTop: S[2],
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
    gap: S[2],
  },
  skipNote: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    textAlign: 'center',
  },
});
