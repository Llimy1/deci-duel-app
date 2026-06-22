import * as FileSystem from 'expo-file-system/legacy';

const AUDIO_DIR = `${FileSystem.documentDirectory}diary-audio/`;

async function ensureAudioDir() {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

/** 임시(캐시) 녹음 파일을 앱 영구 저장소로 복사하고 새 경로를 반환한다. */
export async function persistRecording(tempUri: string, date: string): Promise<string> {
  await ensureAudioDir();
  const ext = tempUri.split('.').pop() || 'm4a';
  const targetUri = `${AUDIO_DIR}${date}-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: targetUri });
  return targetUri;
}

/** 더 이상 참조되지 않는 다이어리 녹음 파일을 삭제한다. */
export async function deleteRecording(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {}
}
