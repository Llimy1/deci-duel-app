import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { C } from '../../theme';

interface Props {
  color?: string;
  size?: number;
  active?: boolean;
  style?: ViewStyle;
}

export default function IdlePulse({ color = C.pink, size = 180, active = true, style }: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [a, active]);

  const rings = [0, 0.28, 0.56];

  return (
    <View style={[{ width: size, height: size }, style]}>
      {rings.map((offset) => {
        const progress = Animated.modulo(Animated.add(a, offset), 1);
        const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] });
        const opacity = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.7, 0.32, 0] });
        return (
          <Animated.View
            key={offset}
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: color,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.core,
          {
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.17,
            left: size * 0.33,
            top: size * 0.33,
            borderColor: color,
            backgroundColor: `${color}22`,
            shadowColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  core: {
    position: 'absolute',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
  },
});
