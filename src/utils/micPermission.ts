import { Alert, Linking } from 'react-native';
// expo-av Audio.getPermissionsAsync()는 iOS 17+에서 deprecated된
// AVAudioSession.recordPermission을 사용해 권한 변경 후에도 stale한 값을 반환할 수 있다.
import { getRecordingPermissionsAsync } from 'expo-audio';

/**
 * 마이크 권한이 있으면 true 반환.
 * 없으면 설정 앱으로 안내하는 Alert를 띄우고 false 반환.
 *
 * - 시스템 권한 다이얼로그는 다시 띄우지 않음 (이미 MicTest 화면에서 처리)
 * - iOS: 한 번 거부하면 앱 내 재요청 불가 → Settings 직접 유도
 * - Android: 영구 거부 이후 동일하게 Settings 유도
 */
export async function requireMicPermission(): Promise<boolean> {
  const { granted } = await getRecordingPermissionsAsync();
  if (granted) return true;

  Alert.alert(
    '마이크 권한 필요',
    '게임 플레이를 위해 마이크 권한이 필요해요.\n설정에서 DeciDuel의 마이크를 허용해주세요.',
    [
      { text: '취소', style: 'cancel' },
      {
        text: '설정 열기',
        onPress: () => Linking.openSettings(),
      },
    ],
  );
  return false;
}
