import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Animated, StyleSheet, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { VizScrollWave } from '../components/DbViz';
import { Btn, Chip } from '../components/ui';
import QuickLogSheet from '../components/QuickLogSheet';
import { C, FONTS, FS, S } from '../theme';
import { useMicDb } from '../hooks/useMicDb';
import { useAppStore } from '../store';
import { createSoloRecord, getSoloRecord } from '../api/soloRecord';
import { showErrorAlert } from '../utils/errorHandler';
import type { DiaryStackParamList, HomeStackParamList } from '../navigation/types';

const MEASURE_DURATION = 5.0;

type Phase = 'ready' | 'measuring' | 'done';
type SoloMeasureParamList = HomeStackParamList & DiaryStackParamList;
type Props = NativeStackScreenProps<SoloMeasureParamList, 'SoloMeasure'>;

export default function SoloMeasureScreen({ navigation, route }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const user = useAppStore((s) => s.user);
  const updateBestDb = useAppStore((s) => s.updateBestDb);
  const accessToken = useAppStore((s) => s.accessToken);

  const [phase, setPhase] = useState<Phase>('ready');
  const [timer, setTimer] = useState(MEASURE_DURATION);
  const [peakResult, setPeakResult] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [prevPeak, setPrevPeak] = useState(0);
  const [soloBest, setSoloBest] = useState(0);
  const [diarySheetVisible, setDiarySheetVisible] = useState(false);
  const [diarySavedToastVisible, setDiarySavedToastVisible] = useState(false);

  const mic = useMicDb();
  const flashAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const diaryToastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!accessToken) return;
    getSoloRecord(accessToken)
      .then((res) => {
        setSoloBest(res.data.bestDb);
        setPrevPeak(res.data.peakDb);
      })
      .catch(() => {});
  }, []);
  const resultAnim = useRef(new Animated.Value(0)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;
  const diaryMode = route.params?.diaryMode === true;

  // 카운트다운
  useEffect(() => {
    if (phase !== 'measuring') return;
    const id = setInterval(() => {
      setTimer((t) => {
        const next = parseFloat((t - 0.1).toFixed(1));
        return next <= 0 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // 타이머 펄스 (1.5초 미만)
  useEffect(() => {
    if (phase === 'measuring' && timer < 1.5 && timer > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(timerAnim, { toValue: 1.12, duration: 160, useNativeDriver: true }),
          Animated.timing(timerAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [timer < 1.5]);

  // 측정 종료
  useEffect(() => {
    if (phase !== 'measuring' || timer > 0) return;
    mic.stop();

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();

    const peak = mic.peak;
    const newBest = peak > soloBest;
    setPeakResult(peak);
    setIsNewBest(newBest);
    if (newBest) { updateBestDb(peak); setSoloBest(peak); }
    setPrevPeak(peak);
    if (accessToken) {
      createSoloRecord(peak, accessToken).catch((e) => showErrorAlert(e, '기록 저장 실패'));
    }
    setPhase('done');
    if (diaryMode) setDiarySheetVisible(true);

    if (newBest) {
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }

    Animated.spring(resultAnim, {
      toValue: 1, tension: 70, friction: 6, useNativeDriver: true,
    }).start();
  }, [timer]);

  const handleStart = () => {
    setDiarySheetVisible(false);
    setDiarySavedToastVisible(false);
    mic.start();
    setTimer(MEASURE_DURATION);
    setPhase('measuring');
  };

  const handleRetry = () => {
    mic.reset();
    setPeakResult(0);
    setIsNewBest(false);
    setDiarySheetVisible(false);
    setDiarySavedToastVisible(false);
    resultAnim.setValue(0);
    timerAnim.setValue(1);
    setTimer(MEASURE_DURATION);
    setPhase('ready');
  };

  const liveDb = phase === 'measuring' ? mic.db : phase === 'done' ? peakResult : 0;
  const dbColor = liveDb > 100 ? C.pink : liveDb > 70 ? C.yellow : C.cyan;
  const timerColor = timer < 1.5 ? C.yellow : C.textDim;
  const compact = height < 740;
  const waveWidth = width - S[5] * 2;
  const waveHeight = Math.min(height * (compact ? 0.22 : 0.25), compact ? 170 : 210);
  const statusText = phase === 'measuring' ? '측정중' : phase === 'done' ? '결과' : '대기';
  const statusColor = phase === 'measuring' ? C.lime : phase === 'done' ? C.yellow : C.textMute;

  const showDiarySavedToast = () => {
    setDiarySavedToastVisible(true);
    diaryToastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(diaryToastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(3200),
      Animated.timing(diaryToastAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setDiarySavedToastVisible(false);
    });
  };

  const openDiary = () => {
    setDiarySavedToastVisible(false);
    const parent = navigation.getParent();
    if (parent) {
      (parent.navigate as any)('DiaryTab', { screen: 'Calendar' });
    }
  };

  const openHome = () => {
    setDiarySavedToastVisible(false);
    const parent = navigation.getParent();
    if (parent) {
      (parent.navigate as any)('HomeTab', { screen: 'Home' });
      return;
    }
    navigation.navigate('Home');
  };

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Flash overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, {
        backgroundColor: flashAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)'],
        }),
        zIndex: 100,
        pointerEvents: 'none',
      } as any]} />

      {isNewBest && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.newBestToast,
            {
              top: top + 62,
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              }],
            },
          ]}
        >
          <Text style={styles.newBestToastText}>신기록! {peakResult.toFixed(1)} dB</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>솔로 측정</Text>
        <Chip color={statusColor} style={styles.statusChip}>
          {statusText}
        </Chip>
      </View>

      {/* Waveform + dB number */}
      <View style={[styles.vizSection, compact && styles.vizSectionCompact]}>
        <View style={styles.timerSlot}>
          {phase === 'measuring' && (
            <Animated.View style={[styles.timerGroup, { transform: [{ scale: timerAnim }] }]}>
              <Text style={[styles.timerNum, { color: timerColor }]}>{timer.toFixed(1)}</Text>
              <Text style={styles.timerUnit}>s</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.waveWrap}>
          <VizScrollWave
            value={liveDb}
            width={waveWidth}
            height={waveHeight}
            cols={compact ? 42 : 50}
          />
        </View>

        {/* dB 숫자 */}
        <View style={styles.dbRow}>
          {phase === 'ready' && (
            <Text style={styles.dbHint}>측정 시작 버튼을 눌러주세요</Text>
          )}
          {phase === 'measuring' && (
            <>
              <Text style={[styles.dbNumber, compact && styles.dbNumberCompact, { color: dbColor, textShadowColor: dbColor, textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } }]}>
                {liveDb.toFixed(1)}
              </Text>
              <Text style={styles.dbUnit}>dB</Text>
            </>
          )}
          {phase === 'done' && (
            <Animated.View style={[styles.resultWrap, {
              opacity: resultAnim,
              transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            }]}>
              <View style={styles.resultNumberRow}>
                <Text style={[styles.dbNumber, compact && styles.dbNumberCompact, {
                  color: isNewBest ? C.yellow : C.pink,
                  textShadowColor: isNewBest ? C.yellow : C.pink,
                  textShadowRadius: 20,
                  textShadowOffset: { width: 0, height: 0 },
                }]}>
                  {peakResult.toFixed(1)}
                </Text>
                <Text style={styles.resultUnit}>dB</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
        <StatBox label="솔로 최고" value={soloBest > 0 ? soloBest.toFixed(1) : '—'} unit="dB" color={C.yellow} />
        <StatBox label="최대" value={phase !== 'ready' ? mic.peak.toFixed(1) : '—'} unit="dB" color={C.pink} />
        <StatBox label="이전" value={prevPeak > 0 ? prevPeak.toFixed(1) : '—'} unit="dB" color={C.cyan} />
      </View>

      {/* Timer bar */}
      {phase === 'measuring' && (
        <View style={styles.timerBarWrap}>
          <View style={styles.timerBg}>
            <View style={[styles.timerFill, {
              width: `${(timer / MEASURE_DURATION) * 100}%`,
              backgroundColor: timer < 1.5 ? C.yellow : C.pink,
            }]} />
          </View>
        </View>
      )}

      {/* CTA */}
      <View style={[styles.cta, { paddingBottom: bottom + S[4] }]}>
        {phase === 'ready' && (
          <Btn variant="primary" size="lg" full onPress={handleStart}>
            측정 시작
          </Btn>
        )}
        {phase === 'measuring' && (
          <Btn variant="ghost" size="lg" full onPress={() => { mic.stop(); handleRetry(); }}>
            취소
          </Btn>
        )}
        {phase === 'done' && (
          <View style={styles.doneActions}>
            <Btn variant="primary" size="md" full onPress={handleRetry}>
              다시 측정
            </Btn>
            <View style={styles.doneSecondaryActions}>
              <View style={styles.doneSecondaryAction}>
                <Btn variant="yellow" size="md" full onPress={() => setDiarySheetVisible(true)}>
                  기록
                </Btn>
              </View>
              <View style={styles.doneSecondaryAction}>
                <Btn variant="ghost" size="md" full onPress={openHome}>
                  홈으로
                </Btn>
              </View>
            </View>
            {diarySavedToastVisible && (
              <Animated.View
                style={[
                  styles.diarySavedToast,
                  {
                    opacity: diaryToastAnim,
                    transform: [{
                      translateY: diaryToastAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Text style={styles.diarySavedToastText}>다이어리에 기록했어요</Text>
                <Pressable onPress={openDiary} style={styles.diarySavedToastButton}>
                  <Text style={styles.diarySavedToastButtonText}>보기</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        )}
      </View>
      <QuickLogSheet
        visible={diarySheetVisible}
        initialDb={peakResult}
        onClose={() => setDiarySheetVisible(false)}
        onSaved={() => {
          if (diaryMode) {
            navigation.goBack();
          } else {
            showDiarySavedToast();
          }
        }}
      />
    </View>
  );
}

function StatBox({
  label, value, unit, color, animValue,
}: {
  label: string; value: string; unit: string; color: string; animValue?: Animated.Value;
}) {
  const inner = (
    <View style={styles.statBox}>
      <Text style={[styles.statLabel, { color: `${color}88` }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>
        {value}<Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
  if (animValue) {
    return <Animated.View style={[{ flex: 1 }, { transform: [{ scale: animValue }] }]}>{inner}</Animated.View>;
  }
  return <View style={{ flex: 1 }}>{inner}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  newBestToast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 90,
    backgroundColor: C.yellow,
    borderRadius: 18,
    paddingHorizontal: S[6],
    paddingVertical: S[4],
    minWidth: 230,
    alignItems: 'center',
    shadowColor: C.yellow,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  newBestToastText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.bg,
  },
  diarySavedToast: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: S[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171020',
    borderWidth: 1,
    borderColor: `${C.purple}88`,
    shadowColor: C.purple,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  diarySavedToastText: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.text,
  },
  diarySavedToastButton: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: S[3],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${C.yellow}22`,
    borderWidth: 1,
    borderColor: `${C.yellow}88`,
  },
  diarySavedToastButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.yellow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingVertical: S[3],
  },
  backBtn: { padding: S[2] },
  backText: { fontSize: 20, color: C.textDim },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.textDim,
    letterSpacing: 0,
  },
  statusChip: {
    minWidth: 68,
    justifyContent: 'center',
  },
  vizSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[5],
    gap: S[3],
  },
  vizSectionCompact: {
    gap: S[2],
  },
  timerSlot: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
  },
  timerNum: {
    fontFamily: FONTS.headBold,
    fontSize: 34,
    lineHeight: 46,
  },
  timerUnit: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: C.textDim,
    paddingTop: 10,
  },
  waveWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S[1],
    marginBottom: S[2],
  },
  dbRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 112,
  },
  dbNumber: {
    fontFamily: FONTS.headBold,
    fontSize: 62,
    lineHeight: 88,
    paddingTop: 6,
  },
  dbNumberCompact: {
    fontSize: 54,
    lineHeight: 76,
  },
  dbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    letterSpacing: 1,
    paddingBottom: 18,
  },
  dbHint: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textMute,
  },
  resultWrap: {
    alignItems: 'center',
    gap: 4,
  },
  resultNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  resultUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    letterSpacing: 1,
    paddingBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: S[5],
    gap: S[2],
    marginBottom: S[3],
  },
  statsRowCompact: {
    marginBottom: S[2],
  },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S[2],
    paddingVertical: S[3],
    alignItems: 'center',
    minHeight: 62,
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    letterSpacing: 0,
    marginBottom: 4,
  },
  statValue: { fontFamily: FONTS.headBold, fontSize: FS.lg },
  statUnit: { fontFamily: FONTS.mono, fontSize: 10, color: C.textDim },
  timerBarWrap: {
    paddingHorizontal: S[5],
    marginBottom: S[3],
  },
  timerBg: {
    width: '100%',
    height: 4,
    backgroundColor: C.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 4,
  },
  cta: { paddingHorizontal: S[5] },
  doneActions: { gap: S[2] },
  doneSecondaryActions: {
    flexDirection: 'row',
    gap: S[2],
  },
  doneSecondaryAction: {
    flex: 1,
  },
});
