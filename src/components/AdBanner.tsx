import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  useForeground,
} from 'react-native-google-mobile-ads';
import { C, S } from '../theme';
import { getMainTabBannerAdUnitId } from '../config/adMob';

interface AdBannerProps {
  placement: 'main-tab-bottom';
  style?: ViewStyle;
}

export default function AdBanner({ placement, style }: AdBannerProps) {
  const bannerRef = useRef<BannerAd>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const unitId = placement === 'main-tab-bottom' ? getMainTabBannerAdUnitId() : null;

  useForeground(() => {
    if (Platform.OS === 'ios' && !hasFailed) {
      bannerRef.current?.load();
    }
  });

  if (!unitId || hasFailed) return null;

  return (
    <View style={[styles.wrap, style]}>
      <BannerAd
        ref={bannerRef}
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setHasFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[3],
    borderTopWidth: 1,
    borderTopColor: `${C.line}88`,
  },
});
