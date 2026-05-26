import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONTS, FS, S, R } from '../../theme';
import { useAppStore } from '../../store';
import { devLogin } from '../../api/auth';
import { fetchMe } from '../../api/me';
import { saveTokens } from '../../utils/secureStorage';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const NUM_COLS = 28;

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
  const [devId, setDevId] = useState('');
  const [devPw, setDevPw] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { height, width } = useWindowDimensions();
  const setAuth = useAppStore((s) => s.setAuth);
  const setTokens = useAppStore((s) => s.setTokens);
  const setMe = useAppStore((s) => s.setMe);
  const compact = height < 740;
  const narrow = width < 380;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const handleSocial = () => {
    navigation.navigate('Nickname');
  };

  const handleDevLogin = async () => {
    if (devId.length < 2 || isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const result = await devLogin(devId, devPw);
      await saveTokens(result.accessToken, result.refreshToken);
      setTokens(result.accessToken, result.refreshToken, result.user.id);
      setAuth(result.user.nickname, C.pink);
      fetchMe().then(setMe).catch(() => {});
    } catch (e: any) {
      setLoginError(e.message ?? '로그인에 실패했습니다');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDevSignup = () => {
    navigation.navigate('DevSignup');
  };

  const SocialBtn = ({
    label,
    bg,
    textColor,
    onPress,
  }: {
    label: string;
    bg: string;
    textColor: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.socialBtn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.socialBtnText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );

  const isIOS = Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: height }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                <SocialBtn label="Apple로 계속하기" bg="#000" textColor="#fff" onPress={handleSocial} />
              )}
              <SocialBtn label="카카오로 계속하기" bg="#FEE500" textColor="#191600" onPress={handleSocial} />
              {!isIOS && (
                <SocialBtn label="Google로 계속하기" bg="#fff" textColor="#202124" onPress={handleSocial} />
              )}
              {isIOS && (
                <SocialBtn label="Google로 계속하기" bg="#fff" textColor="#202124" onPress={handleSocial} />
              )}
            </View>

            <View style={styles.devSeparator}>
              <View style={styles.devLine} />
              <Text style={styles.devSepText}>개발자 로그인</Text>
              <View style={styles.devLine} />
            </View>

            <TextInput
              style={styles.devInput}
              placeholder="ID"
              placeholderTextColor={C.textMute}
              value={devId}
              onChangeText={setDevId}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.devInput, { marginTop: 8 }]}
              placeholder="비밀번호"
              placeholderTextColor={C.textMute}
              value={devPw}
              onChangeText={setDevPw}
              secureTextEntry
            />
            {loginError ? (
              <Text style={styles.errorText}>{loginError}</Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.devLoginBtn, { opacity: pressed || isLoggingIn ? 0.7 : 1 }]}
              onPress={handleDevLogin}
              disabled={isLoggingIn}
            >
              <Text style={styles.devLoginBtnText}>{isLoggingIn ? '로그인 중...' : '로그인'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.devSignupBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleDevSignup}
            >
              <Text style={styles.devSignupBtnText}>개발자 회원가입</Text>
            </Pressable>

            <Text style={styles.terms}>
              계속하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
    letterSpacing: 0,
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
  socialStack: {
    gap: 10,
  },
  socialBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
  },
  devSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: S[4],
    gap: S[2],
  },
  devLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.line,
  },
  devSepText: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 1,
  },
  devInput: {
    height: 48,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    color: C.text,
    paddingHorizontal: S[3],
    fontFamily: FONTS.body,
    fontSize: FS.md,
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.pink,
    marginBottom: 6,
    textAlign: 'center',
  },
  devLoginBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: R.sm,
    backgroundColor: C.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devLoginBtnText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: '#fff',
  },
  devSignupBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: R.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devSignupBtnText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
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
