import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../../theme';

interface Props {
  value: number;
  width?: number;
  height?: number;
  bars?: number;
  accent?: string;
}

export default function MiniWaveform({
  value,
  width = 180,
  height = 62,
  bars = 16,
  accent = C.pink,
}: Props) {
  const pct = Math.max(0, Math.min(1, value / 140));
  const tick = Math.floor(Date.now() / 90);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {Array.from({ length: bars }).map((_, i) => {
        const seed = Math.abs(Math.sin((i + tick) * 0.7) * 0.65 + Math.cos((i + tick) * 1.4) * 0.35);
        const h = Math.max(0.18, Math.min(1, pct * seed + pct * 0.42));
        const hot = h > 0.74;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h * height,
              marginHorizontal: 1.8,
              borderRadius: 4,
              backgroundColor: hot ? C.yellow : accent,
              opacity: 0.38 + pct * 0.58,
              shadowColor: hot ? C.yellow : accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: hot ? 0.75 : 0.32,
              shadowRadius: hot ? 8 : 4,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
