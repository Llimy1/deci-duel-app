import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  /** 현재 온라인 여부 */
  isOnline: boolean;
  /** 초기 상태 로딩 중 여부 (첫 fetch 전까지 true) */
  isLoading: boolean;
}

function toOnline(state: NetInfoState): boolean {
  const connected = state.isConnected ?? true;
  const reachable = state.isInternetReachable !== false;
  return connected && reachable;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // 초기 1회 정확한 상태 확인
    NetInfo.fetch().then((state) => {
      if (!mountedRef.current) return;
      setIsOnline(toOnline(state));
      setIsLoading(false);
    });

    // 이후 실시간 변화 구독
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mountedRef.current) return;
      setIsOnline(toOnline(state));
      setIsLoading(false);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return { isOnline, isLoading };
}
