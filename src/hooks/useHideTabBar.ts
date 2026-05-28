import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../theme';

const HIDDEN_STYLE = {
  height: 0,
  overflow: 'hidden' as const,
  borderTopWidth: 0,
  backgroundColor: C.bg,
};

/**
 * 게임 전용 화면에서 하단 탭 바를 숨깁니다.
 * 화면이 focus 될 때 숨기고, blur 될 때 복원합니다.
 */
export function useHideTabBar(navigation: { getParent: () => any }) {
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: HIDDEN_STYLE });
      return () => {
        navigation.getParent()?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );
}
