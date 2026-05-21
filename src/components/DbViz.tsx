import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { C } from '../theme';

interface VizProps {
  value: number;
  max?: number;
  size?: number;
  accent?: string;
}

// 1. RADIAL — concentric pulsing rings
export function VizRadial({ value, max = 140, size = 200, accent }: VizProps) {
  const a = accent ?? C.pink;
  const pct = Math.min(1, value / max);
  const rings = 8;
  const lit = Math.max(1, Math.round(pct * rings));
  const gradId = `vr-${a.replace('#', '')}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={a} stopOpacity={0.95} />
          <Stop offset="100%" stopColor={a} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill={`url(#${gradId})`} opacity={pct * 0.4} />
      {Array.from({ length: rings }).map((_, i) => {
        const r = 6 + i * 5.5;
        const on = i < lit;
        const danger = i >= rings - 2 && on;
        return (
          <Circle
            key={i}
            cx={50} cy={50} r={r}
            stroke={on ? (danger ? C.yellow : a) : '#221432'}
            strokeWidth={on ? (danger ? 2 : 1.4) : 1}
            fill="none"
            strokeDasharray={i % 2 ? '1.5 2' : undefined}
          />
        );
      })}
      <Circle cx={50} cy={50} r={5 + pct * 4} fill={C.yellow} />
      <Circle cx={50} cy={50} r={2.5} fill="#fff" />
    </Svg>
  );
}

// 2. COLUMN — bell-curve LED bars
export function VizColumn({ value, max = 140, size = 200, accent }: VizProps) {
  const a = accent ?? C.pink;
  const pct = Math.min(1, value / max);
  const cols = 11;

  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'flex-end', margin: size * 0.1 }]}>
        {Array.from({ length: cols }).map((_, i) => {
          const dist = Math.abs(i - (cols - 1) / 2);
          const variance = 1 - (dist / cols) * 1.6;
          const h = Math.max(0.12, pct * variance);
          const hot = h > 0.78;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.min(1, h) * 100}%` as any,
                marginHorizontal: 1.5,
                backgroundColor: hot ? C.yellow : a,
                borderRadius: 3,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                opacity: 0.9,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// 3. WAVEFORM — animated audio wave bars
export function VizWaveform({ value, max = 140, size = 200, accent }: VizProps) {
  const a = accent ?? C.pink;
  const pct = Math.min(1, value / max);
  const bars = 28;
  const tick = Math.floor(Date.now() / 80);

  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: size * 0.06,
        marginVertical: size * 0.24,
      }]}>
        {Array.from({ length: bars }).map((_, i) => {
          const seed = Math.abs(
            Math.sin((i + tick) * 0.7) * 0.5 +
            Math.cos((i + tick) * 1.3) * 0.35 +
            Math.sin((i + tick) * 2.1) * 0.2
          );
          const h = seed * pct + 0.06;
          const hot = h > 0.55;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.min(1, h) * 100}%` as any,
                marginHorizontal: 1,
                backgroundColor: hot ? C.yellow : a,
                borderRadius: 2,
                opacity: 0.9,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// 4. PULSE WAVE — ripple rings that grow/shrink with sound
export function VizPulseWave({ value, max = 140, size = 280, accent }: VizProps) {
  const a = accent ?? C.pink;
  const pct = Math.min(1, Math.max(0, value / max));

  const color = pct > 0.75 ? C.pink : pct > 0.45 ? C.yellow : C.cyan;

  // 3 ripple rings, staggered
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  const DURATION = Math.max(600, 2000 - pct * 1400); // 큰 소리 → 빠른 파장

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: DURATION, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const l1 = makeLoop(ring1, 0);
    const l2 = makeLoop(ring2, DURATION / 3);
    const l3 = makeLoop(ring3, (DURATION / 3) * 2);

    l1.start(); l2.start(); l3.start();
    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [DURATION]);

  const center = size / 2;
  const baseRadius = size * 0.12 + pct * size * 0.14; // 중심원 크기
  const maxRingRadius = size * 0.28 + pct * size * 0.2; // ripple 최대 반경

  const makeRingStyle = (anim: Animated.Value) => {
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.9, 0.6, 0] });
    const ringSize = maxRingRadius * 2;
    return {
      position: 'absolute' as const,
      width: ringSize,
      height: ringSize,
      borderRadius: maxRingRadius,
      borderWidth: 1.5,
      borderColor: color,
      top: center - maxRingRadius,
      left: center - maxRingRadius,
      transform: [{ scale }],
      opacity,
    };
  };

  return (
    <View style={{ width: size, height: size }}>
      {/* Ripple rings */}
      <Animated.View style={makeRingStyle(ring1)} />
      <Animated.View style={makeRingStyle(ring2)} />
      <Animated.View style={makeRingStyle(ring3)} />

      {/* Glow halo */}
      <View style={{
        position: 'absolute',
        width: baseRadius * 2 + 40,
        height: baseRadius * 2 + 40,
        borderRadius: baseRadius + 20,
        backgroundColor: `${color}18`,
        top: center - baseRadius - 20,
        left: center - baseRadius - 20,
      }} />

      {/* 중심원 */}
      <View style={{
        position: 'absolute',
        width: baseRadius * 2,
        height: baseRadius * 2,
        borderRadius: baseRadius,
        backgroundColor: `${color}33`,
        borderWidth: 2,
        borderColor: color,
        top: center - baseRadius,
        left: center - baseRadius,
      }} />
      <View style={{
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#fff',
        top: center - 6,
        left: center - 6,
      }} />
    </View>
  );
}

// 5. SCROLL WAVE — left-to-right scrolling vertical bars
interface ScrollWaveProps {
  value: number;
  max?: number;
  width?: number;
  height?: number;
  cols?: number;
}

export function VizScrollWave({ value, max = 140, width = 320, height = 160, cols = 48 }: ScrollWaveProps) {
  const history = useRef<number[]>(Array(cols).fill(0)).current;

  useEffect(() => {
    history.shift();
    history.push(Math.min(1, value / max));
  }, [value]);

  const barW = width / cols;

  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'center' }}>
      {history.map((pct, i) => {
        const barH = Math.max(3, pct * height * 0.92);
        const recency = i / cols; // 0=오래됨, 1=최신

        // 색상: dB 레벨 + 최신 막대일수록 더 밝고 선명
        const color = pct > 0.78 ? C.pink
          : pct > 0.55 ? C.yellow
          : pct > 0.3 ? C.cyan
          : '#4a3070';

        // 최신 막대는 밝고, 오래된 막대는 흐리게
        const opacity = 0.15 + recency * 0.85;
        // 최신 몇 개는 더 두껍게 (강조)
        const extraW = recency > 0.92 ? 1 : 0;

        return (
          <View
            key={i}
            style={{
              width: barW - 1.2 + extraW,
              height: barH,
              marginHorizontal: 0.6,
              borderRadius: 2.5,
              backgroundColor: color,
              opacity,
              // 최신 막대 그림자 효과
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: recency > 0.85 ? 0.9 : 0,
              shadowRadius: recency > 0.85 ? 4 : 0,
            }}
          />
        );
      })}
    </View>
  );
}

// Animated wrapper that re-renders on value change with smooth transition
interface DbVizProps extends VizProps {
  style?: 'radial' | 'column' | 'waveform' | 'pulse';
}

export function DbViz({ style = 'radial', value, max = 140, size = 200, accent }: DbVizProps) {
  switch (style) {
    case 'column': return <VizColumn value={value} max={max} size={size} accent={accent} />;
    case 'waveform': return <VizWaveform value={value} max={max} size={size} accent={accent} />;
    case 'pulse': return <VizPulseWave value={value} max={max} size={size} accent={accent} />;
    default: return <VizRadial value={value} max={max} size={size} accent={accent} />;
  }
}
