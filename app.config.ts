import type { ConfigContext, ExpoConfig } from 'expo/config';
import dotenv from 'dotenv';
dotenv.config();

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

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function envOrDefault(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

// Google Cloud Console에서 발급받은 iOS OAuth 클라이언트 ID. Firebase 미사용 구성에서는
// `iosUrlScheme`을 `com.googleusercontent.apps.<CLIENT_ID 접두부>` 형태로 등록해야 한다.
// (CLIENT_ID = "<prefix>.apps.googleusercontent.com")
const GOOGLE_IOS_CLIENT_ID = requiredEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');

const GOOGLE_IOS_URL_SCHEME = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(
  /\.apps\.googleusercontent\.com$/,
  '',
)}`;

// Kakao Developers에 등록된 네이티브 앱 키. src/utils/oauthProviders.ts의 런타임 값과
// 반드시 동일해야 하며, 둘 다 같은 EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY를 참조하므로
// .env 한 곳만 바꾸면 자동으로 동기화된다.
const KAKAO_NATIVE_APP_KEY = requiredEnv('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY');

// AdMob App ID. 실제 배포 전 AdMob 콘솔의 앱별 App ID로 교체해야 한다.
// 개발/로컬 빌드에서는 Google 공식 테스트 App ID를 사용해 SDK 초기화만 검증한다.
const ADMOB_IOS_APP_ID = envOrDefault('ADMOB_IOS_APP_ID', 'ca-app-pub-3940256099942544~1458002511');
const ADMOB_ANDROID_APP_ID = envOrDefault('ADMOB_ANDROID_APP_ID', 'ca-app-pub-3940256099942544~3347511713');

// Google AdMob이 권장하는 SKAdNetwork 식별자 목록 (iOS 광고 네트워크 어트리뷰션).
// https://developers.google.com/admob/ios/3p-skadnetworks
const ADMOB_SK_AD_NETWORK_ITEMS = [
  'cstr6suwn9.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  'ydx93a7ass.skadnetwork',
  'p78axxw29g.skadnetwork',
  'v72qych5uu.skadnetwork',
  'ludvb6z3bs.skadnetwork',
  'cp8zw746q7.skadnetwork',
  '3sh42y64q3.skadnetwork',
  'c6k4g5qg8m.skadnetwork',
  's39g8k73mm.skadnetwork',
  'wg4vff78zm.skadnetwork',
  '3qy4746246.skadnetwork',
  'f38h382jlk.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  'v4nxqhlyqp.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'su67r6k2v3.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  'gta9lk7p23.skadnetwork',
  'vutu7akeur.skadnetwork',
  'y5ghdn5j9k.skadnetwork',
  'v9wttpbfk9.skadnetwork',
  'n38lu8286q.skadnetwork',
  '47vhws6wlr.skadnetwork',
  'kbd757ywx3.skadnetwork',
  '9t245vhmpl.skadnetwork',
  'a2p9lx4jpn.skadnetwork',
  '22mmun2rn5.skadnetwork',
  '44jx6755aq.skadnetwork',
  'k674qkevps.skadnetwork',
  '4468km3ulz.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  'kbmxgpxpgc.skadnetwork',
  'uw77j35x4d.skadnetwork',
  '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  'tl55sbb4fm.skadnetwork',
  'c3frkrj4fj.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  '3rd42ekr43.skadnetwork',
  '97r2b46745.skadnetwork',
  '3qcr597p9d.skadnetwork',
];

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
  updates: {
    url: 'https://u.expo.dev/8da7ed01-5758-463a-b552-6f4dec56d474',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
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
    'expo-asset',
    [
      'expo-av',
      {
        microphonePermission: 'DeciDuel은 데시벨 대결을 위해 마이크를 사용합니다.',
      },
    ],
    [
      'expo-audio',
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
    'expo-web-browser',
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
      'react-native-google-mobile-ads',
      {
        iosAppId: ADMOB_IOS_APP_ID,
        androidAppId: ADMOB_ANDROID_APP_ID,
        skAdNetworkItems: ADMOB_SK_AD_NETWORK_ITEMS,
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'DeciDuel은 더 적절한 광고를 보여주기 위해 활동 데이터를 사용할 수 있습니다.',
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
