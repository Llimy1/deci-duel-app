import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
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

import { useAppStore } from './src/store';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import ToastContainer from './src/components/ToastContainer';
import { C } from './src/theme';
import { getTokens, saveTokens, clearTokens } from './src/utils/secureStorage';
import { refreshTokens } from './src/api/auth';
import { Toast } from './src/utils/toast';

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
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const restoreSession = useAppStore((s) => s.restoreSession);

  useEffect(() => {
    async function restoreAuth() {
      try {
        const { refreshToken } = await getTokens();
        if (!refreshToken) return;

        const result = await refreshTokens(refreshToken);
        await saveTokens(result.accessToken, result.refreshToken);
        restoreSession(result.accessToken, result.refreshToken, result.user.id, result.user.nickname);
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
    if (sessionExpired && fontsLoaded && sessionRestored) {
      Toast.info('세션이 만료되었습니다. 다시 로그인해주세요.', 4000);
      setSessionExpired(false);
    }
  }, [sessionExpired, fontsLoaded, sessionRestored]);

  if (!fontsLoaded || !sessionRestored) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.pink} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
          </NavigationContainer>
          <StatusBar style="light" />
          <ToastContainer />
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
