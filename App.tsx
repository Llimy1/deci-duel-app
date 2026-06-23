import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { BowlbyOne_400Regular } from '@expo-google-fonts/bowlby-one';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './src/store';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import ReconsentScreen from './src/screens/auth/ReconsentScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import ToastContainer from './src/components/ToastContainer';
import OfflineBanner from './src/components/OfflineBanner';
import SplashAnimation from './src/components/SplashAnimation';
import { C } from './src/theme';
import { ONBOARDING_KEY } from './src/constants/storageKeys';
import { getTokens, saveTokens, clearTokens } from './src/utils/secureStorage';
import { refreshTokens } from './src/api/auth';
import { Toast } from './src/utils/toast';
import { fetchMeWithRetry } from './src/utils/profileHydration';
import { checkForAppUpdate, skipAppUpdateVersion } from './src/utils/appUpdate';

LogBox.ignoreLogs([
  "Cannot read property 'host' of undefined",
]);

export default function App() {
  const [fontsLoaded] = useFonts({
    BowlbyOne_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  const [sessionRestored, setSessionRestored] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const needsReconsent = useAppStore((s) => s.needsReconsent);
  const restoreSession = useAppStore((s) => s.restoreSession);
  const setMe = useAppStore((s) => s.setMe);

  useEffect(() => {
    // iOS: ATT(App Tracking Transparency) 동의 여부와 무관하게 광고 SDK는 초기화하되,
    // 동의 요청을 먼저 수행해야 AdMob이 (개인화/비개인화 여부에 맞게) 정상적으로 광고를 채울 수 있다.
    // 동의를 거부해도 비개인화 광고는 계속 노출된다.
    requestTrackingPermissionsAsync()
      .catch(() => {})
      .finally(() => {
        mobileAds().initialize().catch(() => {});
      });
  }, []);

  useEffect(() => {
    async function restoreAuth() {
      try {
        // 온보딩 완료 여부 확인
        const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasOnboarded(onboarded === 'true');

        const { refreshToken } = await getTokens();
        if (!refreshToken) return;

        const result = await refreshTokens(refreshToken);
        await saveTokens(result.accessToken, result.refreshToken);
        restoreSession(result.accessToken, result.refreshToken, result.user.id, result.user.nickname);
        try {
          const me = await fetchMeWithRetry();
          setMe(me);
        } catch {
          Toast.info('프로필 정보를 불러오지 못했습니다. 홈에서 다시 시도할 수 있어요.', 4000);
        }
      } catch {
        await clearTokens();
        setSessionExpired(true);
      } finally {
        setSessionRestored(true);
      }
    }

    restoreAuth();
  }, []);

  useEffect(() => {
    if (sessionExpired && splashDone && sessionRestored) {
      Toast.info('세션이 만료되었습니다. 다시 로그인해주세요.', 4000);
      setSessionExpired(false);
    }
  }, [sessionExpired, splashDone, sessionRestored]);

  useEffect(() => {
    if (!splashDone || !sessionRestored) return;

    checkForAppUpdate().then((update) => {
      if (!update) return;
      Alert.alert(
        '업데이트 안내',
        `새로운 버전(${update.version})이 출시되었어요. 업데이트하시겠습니까?`,
        [
          {
            text: '나중에',
            style: 'cancel',
            onPress: () => skipAppUpdateVersion(update.version),
          },
          {
            text: '업데이트',
            onPress: () => Linking.openURL(update.storeUrl).catch(() => {}),
          },
        ],
      );
    });
  }, [splashDone, sessionRestored]);

  useEffect(() => {
    if (!isLoggedIn || hasOnboarded) return;

    setHasOnboarded(true);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
  }, [hasOnboarded, isLoggedIn]);

  // ── Render ──────────────────────────────────────────────────
  // Overlays (Toast, OfflineBanner) are always rendered so they
  // can fire even during the splash animation.

  // 1. Fonts not yet loaded (very brief, < 200 ms typically)
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.pink} />
      </View>
    );
  }

  // 2. Animated splash (plays once, 5.4 s; session restore runs in background)
  if (!splashDone) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <SplashAnimation onDone={() => setSplashDone(true)} />
            <StatusBar style="light" />
            <ToastContainer />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // 3. Splash done; waiting for session restore (should already be done)
  if (!sessionRestored) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.pink} />
      </View>
    );
  }

  // 4. Normal app
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            {isLoggedIn
              ? (needsReconsent
                  ? <ReconsentScreen />
                  : <MainNavigator />)
              : (
                <AuthNavigator
                  key={hasOnboarded ? 'auth-login' : 'auth-onboarding'}
                  initialRouteName={hasOnboarded ? 'Login' : 'Onboarding'}
                />
              )
            }
          </NavigationContainer>
          <StatusBar style="light" />
          <ToastContainer />
          <OfflineBanner />
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
