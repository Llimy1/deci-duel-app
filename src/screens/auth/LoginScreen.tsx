import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import { C, FONTS, FS, S, R } from '../../theme';
import { useAppStore } from '../../store';
import { oauthLogin, type OAuthLoginResponse } from '../../api/oauth';
import { saveTokens } from '../../utils/secureStorage';
import { Toast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/errorHandler';
import { fetchMeWithRetry } from '../../utils/profileHydration';
import {
  signInWithGoogleNative,
  signInWithKakaoNative,
  isOAuthCancelledError,
} from '../../utils/oauthProviders';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const NUM_COLS = 28;

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 533.5 544.3">
      <Path d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z" fill="#4285F4" />
      <Path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z" fill="#34A853" />
      <Path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z" fill="#FBBC04" />
      <Path d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z" fill="#EA4335" />
    </Svg>
  );
}

function MiniWave({ tick }: { tick: number }) {
  return (
    <View style={styles.waveContainer}>
      {Array.from({ length: NUM_COLS }).map((_, i) => {
        const center = (NUM_COLS - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const bell = Math.exp(-dist * dist * 3);
        const anim = Math.abs(Math.sin((i * 0.4 + tick * 0.15)));
        const h = (bell * 0.7 + anim * 0.3) * 48 + 4;
        const hot = h > 36;
        return (
          <View
            key={i}
            style={{
              width: 4,
              height: h,
              marginHorizontal: 1,
              borderRadius: 2,
              backgroundColor: hot ? C.pink : C.cyan,
              opacity: 0.7,
            }}
          />
        );
      })}
    </View>
  );
}

export default function LoginScreen({ navigation }: Props) {
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState<'apple' | 'google' | 'kakao' | null>(null);
  const { height, width } = useWindowDimensions();
  const setAuth = useAppStore((s) => s.setAuth);
  const setTokens = useAppStore((s) => s.setTokens);
  const setMe = useAppStore((s) => s.setMe);
  const setPendingOAuthSignup = useAppStore((s) => s.setPendingOAuthSignup);
  const compact = height < 740;
  const narrow = width < 380;
  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const handleOAuthResult = async (result: OAuthLoginResponse) => {
    if (!result.isNewUser) {
      await saveTokens(result.accessToken, result.refreshToken);
      setTokens(result.accessToken, result.refreshToken, result.user.id);
      setAuth(result.user.nickname, C.pink);
      fetchMeWithRetry()
        .then(setMe)
        .catch(() => {
          Toast.info('프로필 정보를 불러오지 못했습니다. 홈에서 다시 시도할 수 있어요.', 4000);
        });
    } else {
      setPendingOAuthSignup(result.provider, result.signupToken);
      navigation.navigate('Nickname');
    }
  };

  const handleApple = async () => {
    if (loading) return;
    setLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
      });
      if (!credential.identityToken) throw new Error('Apple identityToken 없음');
      const result = await oauthLogin('apple', { idToken: credential.identityToken });
      await handleOAuthResult(result);
    } catch (e) {
      if (!isOAuthCancelledError(e)) {
        Toast.error(getErrorMessage(e));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading('google');
    try {
      const idToken = await signInWithGoogleNative();
      const result = await oauthLogin('google', { idToken });
      await handleOAuthResult(result);
    } catch (e) {
      if (!isOAuthCancelledError(e)) {
        Toast.error(getErrorMessage(e));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleKakao = async () => {
    if (loading) return;
    setLoading('kakao');
    try {
      const accessToken = await signInWithKakaoNative();
      const result = await oauthLogin('kakao', { accessToken });
      await handleOAuthResult(result);
    } catch (e) {
      if (!isOAuthCancelledError(e)) {
        Toast.error(getErrorMessage(e));
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { minHeight: height }]}
        showsVerticalScrollIndicator={false}
      >
        <MiniWave tick={tick} />

        <View style={[styles.wordmarkWrap, compact && styles.wordmarkWrapCompact]}>
          <Text style={[styles.wordmark, narrow && styles.wordmarkNarrow]}>
            {'DECI\nDUEL'}
          </Text>
          <Text style={styles.tagline}>데시벨로 겨루는 1:1 게임</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>계정 연결</Text>

          <View style={styles.socialStack}>
            {isIOS && (
              <Pressable
                onPress={handleApple}
                disabled={!!loading}
                style={({ pressed }) => [
                  styles.socialBtn,
                  { backgroundColor: '#000', opacity: pressed || loading === 'apple' ? 0.75 : 1 },
                ]}
              >
                <View style={styles.socialBtnIcon}>
                  <FontAwesome5 name="apple" size={20} color="#fff" />
                </View>
                <Text style={[styles.socialBtnText, { color: '#fff' }]}>
                  {loading === 'apple' ? '연결 중...' : 'Apple로 계속하기'}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleKakao}
              disabled={!!loading}
              style={({ pressed }) => [
                styles.socialBtn,
                { backgroundColor: '#FEE500', opacity: pressed || loading === 'kakao' ? 0.75 : 1 },
              ]}
            >
              <View style={styles.socialBtnIcon}>
                <FontAwesome5 name="comment" size={19} color="#191600" solid />
              </View>
              <Text style={[styles.socialBtnText, { color: '#191600' }]}>
                {loading === 'kakao' ? '연결 중...' : '카카오로 계속하기'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGoogle}
              disabled={!!loading}
              style={({ pressed }) => [
                styles.socialBtn,
                { backgroundColor: '#fff', opacity: pressed || loading === 'google' ? 0.75 : 1 },
              ]}
            >
              <View style={styles.socialBtnIcon}>
                <GoogleIcon />
              </View>
              <Text style={[styles.socialBtnText, { color: '#202124' }]}>
                {loading === 'google' ? '연결 중...' : 'Google로 계속하기'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.terms}>
            계속하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: {
    paddingHorizontal: S[5],
    paddingBottom: S[8],
    alignItems: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 56,
    marginTop: S[5],
    paddingHorizontal: S[5],
    overflow: 'hidden',
  },
  wordmarkWrap: {
    alignItems: 'center',
    marginTop: S[6],
    marginBottom: S[6],
  },
  wordmarkWrapCompact: {
    marginTop: S[4],
    marginBottom: S[4],
  },
  wordmark: {
    fontFamily: FONTS.display,
    fontSize: 64,
    lineHeight: 76,
    color: C.text,
    textAlign: 'center',
    paddingHorizontal: S[5],
    paddingTop: 16,
  },
  wordmarkNarrow: {
    fontSize: 56,
    lineHeight: 66,
  },
  tagline: {
    fontFamily: FONTS.headBold,
    fontSize: 16,
    color: C.textDim,
    marginTop: S[3],
    letterSpacing: 0.2,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S[5],
  },
  cardLabel: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: C.textMute,
    letterSpacing: 1.5,
    marginBottom: S[4],
    textTransform: 'uppercase',
  },
  socialStack: { gap: 10 },
  socialBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnIcon: {
    position: 'absolute',
    left: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
  },
  terms: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: C.textMute,
    textAlign: 'center',
    marginTop: S[4],
    lineHeight: 15,
    paddingHorizontal: S[2],
  },
});
