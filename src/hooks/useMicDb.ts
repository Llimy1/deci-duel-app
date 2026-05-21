import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

const CALIBRATION_OFFSET = 100; // dBFS → approx dB SPL

export interface MicDbState {
  db: number;
  peak: number;
  hasPermission: boolean | null;
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function useMicDb(): MicDbState {
  const [db, setDb] = useState(0);
  const [peak, setPeak] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ granted }) => {
      setHasPermission(granted);
    });
    return () => {
      stop();
    };
  }, []);

  const start = useCallback(async () => {
    if (!hasPermission) {
      const { granted } = await Audio.requestPermissionsAsync();
      setHasPermission(granted);
      if (!granted) return;
    }

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
      const status = await recording.getStatusAsync();
      if (status.isRecording && status.metering !== undefined) {
        // metering is dBFS (negative). Convert to positive SPL approximation.
        const raw = status.metering + CALIBRATION_OFFSET;
        const clamped = Math.max(0, Math.min(140, raw));
        setDb(clamped);
        setPeak((prev) => Math.max(prev, clamped));
      }
    }, 60);
  }, [hasPermission]);

  const stop = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setDb(0);
    setPeak(0);
  }, [stop]);

  return { db, peak, hasPermission, isRecording, start, stop, reset };
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
