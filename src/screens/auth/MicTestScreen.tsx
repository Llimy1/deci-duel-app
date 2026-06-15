import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
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
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
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
  // expo-av의 Audio.getPermissionsAsync()는 iOS 17+에서 deprecated된
  // AVAudioSession.recordPermission을 사용해 권한 변경 후 상태가 갱신되지 않는
  // 문제가 있어, AVAudioApplication 기반인 expo-audio API를 사용한다.
  useFocusEffect(
    useCallback(() => {
      getRecordingPermissionsAsync().then(({ granted }) => {
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

  // 설정 앱에서 권한을 변경하고 돌아왔을 때(앱이 종료되지 않고 background→active로
  // 전환되는 경우) useFocusEffect는 다시 실행되지 않으므로, AppState 변화로
  // 권한 상태를 다시 확인한다.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getRecordingPermissionsAsync().then(({ granted }) => {
          setPermStatus(granted ? 'granted' : 'denied');
        });
      }
    });
    return () => sub.remove();
  }, []);

  const handleRequestPermission = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
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
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
                <Ionicons name="warning-outline" size={18} color={C.yellow} style={styles.deniedIcon} />
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
                {testing ? '테스트 중단' : '테스트 시작'}
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
            <Ionicons name="lock-closed-outline" size={20} color={C.textDim} style={styles.lockIcon} />
            <Text style={styles.privacyText}>
              다이어리에 남긴 녹음은 내 폰에만 저장돼. 서버로 전송되지 않고, 다른 사람에게
              공개되지 않아.
            </Text>
          </View>
        </Card>
      </ScrollView>

      {permStatus === 'granted' && (
        <View style={styles.ctaWrap}>
          <Btn variant="primary" size="xl" full onPress={handleNext}>
            다음 →
          </Btn>
          <Text style={styles.skipNote}>테스트를 건너뛰어도 돼</Text>
        </View>
      )}
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
  scroll: {
    flex: 1,
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
    alignItems: 'baseline',
    gap: 4,
    minHeight: 48,
  },
  dbNumber: {
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 48,
    includeFontPadding: false,
  },
  dbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    lineHeight: 18,
    includeFontPadding: false,
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
  deniedIcon: {
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
    marginTop: 1,
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
    width: '100%',
  },
  skipNote: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    textAlign: 'center',
  },
});
