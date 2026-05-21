import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StageBg, Chip } from '../components/ui';
import { C, FONTS, FS } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Countdown'>;

const LABELS: Record<number, string> = {
  3: '준비',
  2: '숨 들이쉬고',
  1: '폐 가득',
  0: '소리쳐라!',
};

const COLORS: Record<number, string> = {
  3: C.cyan,
  2: C.yellow,
  1: C.pink,
  0: C.lime,
};

export default function CountdownScreen({ navigation }: Props) {
  const [n, setN] = useState(3);
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    scaleAnim.setValue(0.6);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 80, friction: 5, useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]),
    ]).start();
  };

  useEffect(() => {
    animateIn();
  }, [n]);

  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(() => navigation.replace('Measure'), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((prev) => prev - 1), 900);
    return () => clearTimeout(t);
  }, [n]);

  const color = COLORS[n];

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.bg, `${color}22`],
  });

  return (
    <Animated.View style={[styles.bg, { backgroundColor: bgColor }]}>
      {/* Mic live indicator */}
      <View style={styles.micChip}>
        <Chip color={C.lime}>🎤 마이크 ON</Chip>
      </View>

      <View style={styles.center}>
        <Text style={[styles.label, { color }]}>{LABELS[n]}</Text>
        <Animated.Text
          style={[
            styles.number,
            {
              color,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              textShadowColor: color,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 40,
            },
          ]}
        >
          {n === 0 ? 'GO' : n}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: C.bg,
  },
  micChip: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    letterSpacing: 0,
  },
  number: {
    fontFamily: FONTS.display,
    fontSize: 200,
    lineHeight: 200,
  },
});
