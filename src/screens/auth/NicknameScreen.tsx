import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn } from '../../components/ui';
import { useAppStore } from '../../store';
import { checkNicknameAvailability } from '../../api/user';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Nickname'>;

const MAX_LEN = 10;
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]+$/;

export default function NicknameScreen({ navigation }: Props) {
  const [value, setValue] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const { height, width } = useWindowDimensions();
  const setNickname = useAppStore((s) => s.setNickname);
  const setAvatarColor = useAppStore((s) => s.setAvatarColor);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const narrow = width < 380;
  const nickname = value.trim();
  const hasValidCharacters = nickname.length === 0 || NICKNAME_PATTERN.test(nickname);

  const valid = nickname.length >= 2 && nicknameAvailable === true;

  useEffect(() => {
    if (nickname.length < 2 || !hasValidCharacters) {
      setIsChecking(false);
      setNicknameAvailable(null);
      setCheckFailed(false);
      return;
    }

    let ignore = false;

    setIsChecking(true);
    setNicknameAvailable(null);
    setCheckFailed(false);

    const timeoutId = setTimeout(async () => {
      try {
        const available = await checkNicknameAvailability(nickname);

        if (!ignore) {
          setNicknameAvailable(available);
        }
      } catch {
        if (!ignore) {
          setCheckFailed(true);
          setNicknameAvailable(null);
        }
      } finally {
        if (!ignore) {
          setIsChecking(false);
        }
      }
    }, 400);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [hasValidCharacters, nickname]);

  const handleContinue = async () => {
    if (!valid || isSubmitting) return;

    setIsSubmitting(true);
    setNickname(nickname);
    setAvatarColor(avatarColor);
    navigation.navigate('Photo');
    setIsSubmitting(false);
  };

  const getStatus = () => {
    if (nickname.length < 2) {
      return { text: '2자 이상', color: C.textMute };
    }

    if (!hasValidCharacters) {
      return { text: '한글, 영문, 숫자만 사용할 수 있어요', color: C.pink };
    }

    if (isChecking) {
      return { text: '확인 중...', color: C.textDim };
    }

    if (checkFailed) {
      return { text: '중복 확인에 실패했어요', color: C.yellow };
    }

    if (nicknameAvailable) {
      return { text: '✓ 사용 가능', color: C.lime };
    }

    return { text: '이미 사용 중인 닉네임', color: C.pink };
  };

  const status = getStatus();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.step}>01 / 04</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: height * 0.72 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>닉네임</Text>
          <Text style={[styles.heading, narrow && styles.headingNarrow]}>{'너의 이름을\n지어줘.'}</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={[
                styles.input,
                narrow && styles.inputNarrow,
                { borderBottomColor: value.length > 0 ? C.pink : C.line },
              ]}
              value={value}
              onChangeText={(t) => setValue(t.slice(0, MAX_LEN))}
              placeholder="닉네임 입력"
              placeholderTextColor={C.textMute}
              autoFocus
              autoCapitalize="none"
              maxLength={MAX_LEN}
            />
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            <Text style={styles.counter}>{value.length}/{MAX_LEN}</Text>
          </View>
        </ScrollView>

        <View style={styles.ctaWrap}>
          <Btn
            variant="primary"
            size="xl"
            full
            disabled={!valid || isSubmitting}
            onPress={handleContinue}
          >
            {isSubmitting ? '처리 중...' : '계속'}
          </Btn>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[2],
  },
  backBtn: {
    padding: S[2],
  },
  backText: {
    fontSize: 28,
    color: C.textDim,
    fontFamily: FONTS.headBold,
  },
  step: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
  },
  scroll: {
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[10],
  },
  label: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.pink,
    letterSpacing: 0,
    marginBottom: S[3],
  },
  heading: {
    fontFamily: FONTS.headBold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: 0,
    color: C.text,
    marginBottom: S[8],
  },
  headingNarrow: {
    fontSize: 30,
    lineHeight: 38,
  },
  inputWrap: {
    marginBottom: S[3],
  },
  input: {
    height: 56,
    fontSize: FS.xl,
    fontFamily: FONTS.bodySemibold,
    color: C.text,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.sm,
    paddingHorizontal: S[3],
    letterSpacing: 0,
  },
  inputNarrow: {
    fontSize: FS.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S[6],
  },
  statusText: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
  },
  counter: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
  ctaWrap: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
    gap: S[3],
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.pink,
    textAlign: 'center',
  },
});
