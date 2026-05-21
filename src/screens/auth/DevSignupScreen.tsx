import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn } from '../../components/ui';
import { useAppStore } from '../../store';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'DevSignup'>;

export default function DevSignupScreen({ navigation }: Props) {
  const [devId, setDevId] = useState('');
  const [devPw, setDevPw] = useState('');
  const { height, width } = useWindowDimensions();
  const narrow = width < 380;

  const setPendingDevCredentials = useAppStore((s) => s.setPendingDevCredentials);
  const valid = devId.trim().length >= 2 && devPw.length >= 4;

  const handleContinue = () => {
    if (valid) {
      setPendingDevCredentials(devId.trim(), devPw);
      navigation.navigate('Nickname');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.step}>회원가입</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: height * 0.72 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>개발자</Text>
          <Text style={[styles.heading, narrow && styles.headingNarrow]}>
            {'계정부터\n만들자.'}
          </Text>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>아이디</Text>
            <TextInput
              style={styles.input}
              placeholder="사용할 ID"
              placeholderTextColor={C.textMute}
              value={devId}
              onChangeText={setDevId}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={[styles.inputLabel, styles.passwordLabel]}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor={C.textMute}
              value={devPw}
              onChangeText={setDevPw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />

            <Text style={styles.helperText}>
              ID는 2자 이상, 비밀번호는 4자 이상 입력해주세요.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.ctaWrap}>
          <Btn variant="primary" size="xl" full disabled={!valid} onPress={handleContinue}>
            닉네임 정하기
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
    fontFamily: FONTS.headBold,
    fontSize: 28,
    color: C.textDim,
  },
  step: {
    fontFamily: FONTS.bodySemibold,
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
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: C.text,
    marginBottom: S[8],
  },
  headingNarrow: {
    fontSize: 32,
    lineHeight: 38,
  },
  form: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
    padding: S[5],
  },
  inputLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
    marginBottom: S[2],
  },
  passwordLabel: {
    marginTop: S[4],
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    color: C.text,
    paddingHorizontal: S[3],
    fontFamily: FONTS.body,
    fontSize: FS.md,
  },
  helperText: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    lineHeight: 18,
    marginTop: S[4],
  },
  ctaWrap: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
  },
});
