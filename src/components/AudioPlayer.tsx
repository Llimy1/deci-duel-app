import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { C, FONTS, FS, R, S } from '../theme';

interface Props {
  uri: string;
}

const BAR_HEIGHTS = [40, 70, 100, 55, 80, 35, 65, 45, 90, 30, 60, 50];

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ uri }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const onStatusUpdate = (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      setPosition(status.positionMillis);
      setDuration(status.durationMillis ?? 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        soundRef.current?.setPositionAsync(0);
        setIsPlaying(false);
        setPosition(0);
      }
    };

    const load = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false }, onStatusUpdate);
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {}
    };

    load();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [uri]);

  const toggle = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch {}
  };

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const activeBars = Math.round(progress * BAR_HEIGHTS.length);

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.playBtn} onPress={toggle}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={C.text} />
      </Pressable>
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[styles.bar, { height: `${h}%`, backgroundColor: i < activeBars ? C.purple : C.line }]}
          />
        ))}
      </View>
      <Text style={styles.time}>{formatTime(position)} / {formatTime(duration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    minHeight: 3,
  },
  time: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0.5,
  },
});
