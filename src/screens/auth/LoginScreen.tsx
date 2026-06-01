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
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

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
    Alert.alert(
      '준비 중',
      '소셜 로그인은 준비 중입니다.\n개발자 로그인을 이용해 주세요.',
      [{ text: '확인' }]
    );
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
    icon,
  }: {
    label: string;
    bg: string;
    textColor: string;
    onPress: () => void;
    icon?: React.ReactNode;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.socialBtn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }]}
    >
      {icon && <View style={styles.socialBtnIcon}>{icon}</View>}
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
                <SocialBtn label="Apple로 계속하기" bg="#000" textColor="#fff" onPress={handleSocial}
                  icon={<FontAwesome5 name="apple" size={20} color="#fff" />} />
              )}
              <SocialBtn label="카카오로 계속하기" bg="#FEE500" textColor="#191600" onPress={handleSocial}
                icon={<FontAwesome5 name="comment" size={19} color="#191600" solid />} />
              {!isIOS && (
                <SocialBtn label="Google로 계속하기" bg="#fff" textColor="#202124" onPress={handleSocial}
                  icon={<GoogleIcon />} />
              )}
              {isIOS && (
                <SocialBtn label="Google로 계속하기" bg="#fff" textColor="#202124" onPress={handleSocial}
                  icon={<GoogleIcon />} />
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
