import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 정적 app.json → 동적 app.config.ts 전환 (2026-06-07)
 *
 * 이유: Google/Kakao 네이티브 SDK plugin 설정(클라이언트 ID, native app key 등)을
 * `.env`(EXPO_PUBLIC_*)와 한 곳에서 관리하기 위함. 기존에는 app.json(정적)과
 * src/utils/oauthProviders.ts(런타임)에 같은 값을 두 번 적어야 했음 — 동기화 누락 위험.
 *
 * Expo CLI는 expo start/prebuild/export/EAS build 실행 시 `.env`를 자동으로 로드해
 * 이 파일 평가 시점에 `process.env.*`로 값을 제공한다 (별도 dotenv 패키지 불필요).
 *
 * 주의: 값이 바뀌면(특히 nativeAppKey/iosUrlScheme) `npx expo prebuild --clean` 후
 * development build 재생성이 필요하다 — 정적 app.json이었을 때와 동일.
 */

// Google Cloud Console에서 발급받은 iOS OAuth 클라이언트 ID. Firebase 미사용 구성에서는
// `iosUrlScheme`을 `com.googleusercontent.apps.<CLIENT_ID 접두부>` 형태로 등록해야 한다.
// (CLIENT_ID = "<prefix>.apps.googleusercontent.com")
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '141896064594-be152nedj9891hqmsg5r61p142jan81r.apps.googleusercontent.com';

const GOOGLE_IOS_URL_SCHEME = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(
  /\.apps\.googleusercontent\.com$/,
  '',
)}`;

// Kakao Developers에 등록된 네이티브 앱 키. src/utils/oauthProviders.ts의 런타임 값과
// 반드시 동일해야 하며, 둘 다 같은 EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY를 참조하므로
// .env 한 곳만 바꾸면 자동으로 동기화된다.
const KAKAO_NATIVE_APP_KEY =
  process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? 'ebd70c0a267863d0ff826c34cea86674';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DeciDuel',
  slug: 'deci-duel-app',
  scheme: 'deciduelapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    backgroundColor: '#0a0612',
  },
  ios: {
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      NSMicrophoneUsageDescription: 'DeciDuel은 데시벨 대결을 위해 마이크를 사용합니다.',
      NSPhotoLibraryUsageDescription:
        'DeciDuel은 프로필 이미지를 설정하기 위해 사진 보관함에 접근합니다.',
    },
    bundleIdentifier: 'com.deciduel.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0612',
    },
    permissions: ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS'],
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.deciduel.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-av',
      {
        microphonePermission: 'DeciDuel은 데시벨 대결을 위해 마이크를 사용합니다.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'DeciDuel은 프로필 이미지를 설정하기 위해 사진 보관함에 접근합니다.',
      },
    ],
    'expo-secure-store',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: GOOGLE_IOS_URL_SCHEME,
      },
    ],
    [
      '@react-native-kakao/core',
      {
        nativeAppKey: KAKAO_NATIVE_APP_KEY,
        android: {
          authCodeHandlerActivity: true,
        },
        ios: {
          handleKakaoOpenUrl: true,
        },
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '8da7ed01-5758-463a-b552-6f4dec56d474',
    },
  },
  owner: 'llimy1',
});
