import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { C, FS } from '../theme';

type BannerState = 'hidden' | 'offline' | 'reconnected';

const BANNER_HEIGHT = 44;
const RECONNECTED_DURATION_MS = 2500;

export default function OfflineBanner() {
  const { isOnline, isLoading } = useNetworkStatus();
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT - 20)).current;
  const prevOnlineRef = useRef<boolean | null>(null);
  const insets = useSafeAreaInsets();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const prev = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline) {
      // 오프라인 전환 → 배너 표시
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setBannerState('offline');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else if (prev === false) {
      // 오프라인 → 온라인 복귀 → "재연결됨" 2.5초 표시 후 숨김
      setBannerState('reconnected');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();

      hideTimerRef.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -(BANNER_HEIGHT + insets.top + 20),
          duration: 280,
          useNativeDriver: true,
        }).start(() => setBannerState('hidden'));
      }, RECONNECTED_DURATION_MS);
    }
  }, [isOnline, isLoading]);

  // cleanup timer on unmount
  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  if (bannerState === 'hidden') return null;

  const isOffline = bannerState === 'offline';
  const topPadding = insets.top > 0 ? insets.top : 12;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
          backgroundColor: isOffline ? '#c62828' : '#2e7d32',
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>
        {isOffline ? '🔴  인터넷 연결이 없습니다' : '🟢  인터넷에 다시 연결되었습니다'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 20,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: BANNER_HEIGHT,
  },
  text: {
    color: '#ffffff',
    fontSize: FS.sm,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
