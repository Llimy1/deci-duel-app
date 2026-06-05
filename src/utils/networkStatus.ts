/**
 * 네트워크 상태 싱글톤
 *
 * NetInfo 이벤트를 구독해 최신 온라인 여부를 캐시한다.
 * React 렌더 사이클 밖(api/client.ts 등)에서 동기적으로 조회하는 용도.
 */
import NetInfo from '@react-native-community/netinfo';

/** 초기값: 낙관적으로 온라인 가정 (앱 시작 직후 fetch 전) */
let _isOnline = true;

NetInfo.addEventListener((state) => {
  // isInternetReachable: Android는 신뢰도 높음, iOS는 null일 수 있어 undefined 처리
  const connected = state.isConnected ?? true;
  const reachable = state.isInternetReachable !== false; // null → true(낙관적)
  _isOnline = connected && reachable;
});

/** API 호출 전 빠른 오프라인 체크용. false면 즉시 에러 throw 가능. */
export function getIsOnline(): boolean {
  return _isOnline;
}
