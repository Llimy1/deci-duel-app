import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
// expo-av Audio.requestPermissionsAsync()는 iOS 17+에서 deprecated된
// AVAudioSession.recordPermission을 사용해 권한 변경 후에도 stale한 값을 반환할 수 있다.
// 권한 확인/요청은 AVAudioApplication 기반인 expo-audio를 사용하고,
// 실제 녹음/미터링은 기존대로 expo-av Audio.Recording을 사용한다.
import { requestRecordingPermissionsAsync } from 'expo-audio';

const CALIBRATION_OFFSET = 100; // dBFS → approx dB SPL

// expo-av Android 네이티브(AVManager.java)는 20*Math.log(amplitude/32767)로 계산 —
// 표준 dBFS(20*log10)가 아닌 자연로그(ln) 기반이라 같은 소리도 iOS보다 값이 낮음.
// 1/ln(10) ≈ 0.4343 을 곱해 log10 스케일로 변환한 뒤 CALIBRATION_OFFSET 적용.
const ANDROID_LOG_CORRECTION = 1 / Math.LN10; // ≈ 0.4343

export interface MicDbState {
  db: number;
  peak: number;
  hasPermission: boolean | null;
  isRecording: boolean;
  start: () => Promise<boolean>;
  stop: () => Promise<string | null>;
  reset: () => void;
  getDb: () => number;
  getPeak: () => number;
}

export function useMicDb(): MicDbState {
  const [db, setDb] = useState(0);
  const [peak, setPeak] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dbRef = useRef(0);
  const peakRef = useRef(0);
  // Ref-tracked permission so `start` stays stable even when Android grants
  // permission mid-session (avoids re-creating start → remounting measuring effect)
  const hasPermissionRef = useRef<boolean | null>(null);

  useEffect(() => {
    requestRecordingPermissionsAsync().then(({ granted }) => {
      hasPermissionRef.current = granted;
      setHasPermission(granted);
    });
    return () => {
      stop();
    };
  }, []);

  // Keep ref in sync whenever state changes (e.g. permission granted inside start)
  useEffect(() => {
    hasPermissionRef.current = hasPermission;
  }, [hasPermission]);

  const start = useCallback(async () => {
    // 기존 interval 먼저 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // 기존 녹음 인스턴스가 살아있으면 먼저 종료 (_recorderExists 해제).
    // ref를 async 작업 전에 먼저 null로 비워야 stop()과 start()가 동시에 같은
    // 인스턴스의 stopAndUnloadAsync()를 호출하는 race condition을 막을 수 있음.
    // (두 번 호출 시 unloadAudioRecorder()가 throw → _recorderExists 미해제 → 다음 측정 차단)
    const staleRecording = recordingRef.current;
    recordingRef.current = null;
    if (staleRecording) {
      try { await staleRecording.stopAndUnloadAsync(); } catch {}
    }

    // 권한 확인 — ref 사용으로 start 함수 재생성 방지
    let permitted = hasPermissionRef.current;
    if (!permitted) {
      const { granted } = await requestRecordingPermissionsAsync();
      hasPermissionRef.current = granted;
      setHasPermission(granted);
      permitted = granted;
    }
    if (!permitted) return false;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);

      intervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          // metering은 dBFS(음수). iOS는 log10 기반, Android는 ln 기반이므로 보정 후 변환.
          const normalized = Platform.OS === 'android'
            ? status.metering * ANDROID_LOG_CORRECTION  // ln → log10 스케일로 변환
            : status.metering;
          const raw = normalized + CALIBRATION_OFFSET;
          const clamped = Math.max(0, Math.min(140, raw));
          dbRef.current = clamped;
          peakRef.current = Math.max(peakRef.current, clamped);
          setDb(clamped);
          setPeak(peakRef.current);
        }
      }, 60);
      return true;
    } catch (err) {
      console.warn('[useMicDb] start failed:', err);
      return false;
    }
  }, []); // 의존성 없음 — hasPermission은 ref로 읽어 start 레퍼런스 안정화

  const stop = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // ref를 먼저 null로 비워 start()와의 동시 접근(race condition) 방지
    const recording = recordingRef.current;
    recordingRef.current = null;
    let uri: string | null = null;
    if (recording) {
      uri = recording.getURI();
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
    }
    setIsRecording(false);
    return uri;
  }, []);

  const reset = useCallback(() => {
    // stop()은 start()가 내부에서 이미 처리함.
    // reset()에서 stop()을 void로 호출하면 start()와 race condition 발생:
    //   stop()이 recordingRef.current = null 하는 타이밍에
    //   start()가 새 Recording을 생성해놓은 걸 덮어씌워 마이크가 죽음.
    dbRef.current = 0;
    peakRef.current = 0;
    setDb(0);
    setPeak(0);
  }, []);

  const getDb = useCallback(() => dbRef.current, []);
  const getPeak = useCallback(() => peakRef.current, []);

  return { db, peak, hasPermission, isRecording, start, stop, reset, getDb, getPeak };
}

// Simulated dB ticker for the opponent (offline mode)
export function useSimDb(profile: 'duel-opp' | 'idle' = 'duel-opp', autoStart = false) {
  const [db, setDb] = useState(40);
  const [peak, setPeak] = useState(40);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(autoStart);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setT((prev) => {
        const next = prev + 0.06;
        const target = sampleProfile(profile, next);
        setDb((d) => {
          const jitter = (Math.random() - 0.5) * 6;
          const nv = Math.max(38, Math.min(140, d * 0.55 + (target + jitter) * 0.45));
          setPeak((p) => Math.max(p, nv));
          return nv;
        });
        return next;
      });
    }, 60);
    return () => clearInterval(id);
  }, [running, profile]);

  return {
    db, peak, running,
    start: () => setRunning(true),
    stop: () => setRunning(false),
    reset: () => { setRunning(false); setDb(40); setPeak(40); setT(0); },
  };
}

function sampleProfile(name: string, t: number): number {
  switch (name) {
    case 'duel-opp':
      if (t < 0.6) return 48 + t * 50;
      if (t < 2.0) return 88 + Math.sin(t * 4) * 10;
      if (t < 2.8) return 100 + Math.sin(t * 6) * 5;
      if (t < 3.0) return 108 + Math.sin(t * 9) * 3;
      return 92 - (t - 3.0) * 25;
    default:
      return 60;
  }
}
