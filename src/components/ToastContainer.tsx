import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONTS, FS, S } from '../theme';
import { Toast, ToastType } from '../utils/toast';

interface ToastState {
  message: string;
  type: ToastType;
}

const TYPE_COLOR: Record<ToastType, string> = {
  error: C.pink,
  success: C.lime,
  info: C.cyan,
};

export default function ToastContainer() {
  const { top } = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }, [anim]);

  const show = useCallback((message: string, type: ToastType, duration: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    anim.setValue(0);
    setToast({ message, type });
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    timerRef.current = setTimeout(dismiss, duration);
  }, [anim, dismiss]);

  useEffect(() => {
    Toast._register(({ message, type = 'error', duration = 3000 }) => {
      show(message, type, duration);
    });
    return () => {
      Toast._unregister();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  if (!toast) return null;

  const color = TYPE_COLOR[toast.type];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          top: top + 12,
          borderColor: `${color}55`,
          shadowColor: color,
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-14, 0],
            }),
          }],
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    gap: S[3],
    maxWidth: 320,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  indicator: {
    width: 3,
    height: 26,
    borderRadius: 2,
  },
  message: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.sm,
    color: C.text,
    flex: 1,
    lineHeight: 20,
  },
});
