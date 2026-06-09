import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn } from '../../components/ui';
import { TERMS_VERSION, PRIVACY_VERSION } from '../../constants/consent';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Terms'>;

export default function TermsScreen({ navigation }: Props) {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const { height, width } = useWindowDimensions();
  const narrow = width < 380;
  const canContinue = termsAgreed && privacyAgreed;

  const handleViewTerms = () => {
    Linking.openURL('https://deciduel.com/terms');
  };

  const handleViewPrivacy = () => {
    Linking.openURL('https://deciduel.com/privacy');
  };

  const handleAgreeAll = () => {
    const next = !(termsAgreed && privacyAgreed);
    setTermsAgreed(next);
    setPrivacyAgreed(next);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    navigation.navigate('Photo', {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.step}>02 / 04</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { minHeight: height * 0.72 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>약관 동의</Text>
        <Text style={[styles.heading, narrow && styles.headingNarrow]}>
          {'시작 전에\n동의가 필요해.'}
        </Text>
        <Text style={styles.sub}>
          아래 약관을 확인하고 동의해주세요.
        </Text>

        {/* 전체 동의 */}
        <Pressable style={styles.agreeAllRow} onPress={handleAgreeAll}>
          <CheckboxBig checked={termsAgreed && privacyAgreed} />
          <Text style={styles.agreeAllLabel}>전체 동의</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* 이용약관 */}
        <Pressable
          style={styles.agreeRow}
          onPress={() => setTermsAgreed((v) => !v)}
        >
          <Checkbox checked={termsAgreed} />
          <Text style={styles.agreeLabel}>
            <Text style={styles.agreeRequired}>[필수] </Text>
            이용약관에 동의합니다
          </Text>
          <Pressable onPress={handleViewTerms} style={styles.viewBtn} hitSlop={12}>
            <Text style={styles.viewBtnText}>보기</Text>
          </Pressable>
        </Pressable>

        {/* 개인정보처리방침 */}
        <Pressable
          style={styles.agreeRow}
          onPress={() => setPrivacyAgreed((v) => !v)}
        >
          <Checkbox checked={privacyAgreed} />
          <Text style={styles.agreeLabel}>
            <Text style={styles.agreeRequired}>[필수] </Text>
            개인정보처리방침에 동의합니다
          </Text>
          <Pressable onPress={handleViewPrivacy} style={styles.viewBtn} hitSlop={12}>
            <Text style={styles.viewBtnText}>보기</Text>
          </Pressable>
        </Pressable>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Btn
          variant="primary"
          size="xl"
          full
          disabled={!canContinue}
          onPress={handleContinue}
        >
          동의하고 계속
        </Btn>
      </View>
    </SafeAreaView>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[cbStyles.box, checked && cbStyles.boxChecked]}>
      {checked && <Text style={cbStyles.check}>✓</Text>}
    </View>
  );
}

function CheckboxBig({ checked }: { checked: boolean }) {
  return (
    <View style={[cbStyles.boxBig, checked && cbStyles.boxChecked]}>
      {checked && <Text style={cbStyles.checkBig}>✓</Text>}
    </View>
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
  content: {
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[5],
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
    letterSpacing: -0.5,
    color: C.text,
    marginBottom: S[3],
  },
  headingNarrow: {
    fontSize: 30,
    lineHeight: 38,
  },
  sub: {
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.textDim,
    marginBottom: S[6],
  },
  agreeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    paddingVertical: S[3],
  },
  agreeAllLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.md,
    color: C.text,
  },
  divider: {
    height: 1,
    backgroundColor: C.line,
    marginBottom: S[3],
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    paddingVertical: S[3],
  },
  agreeLabel: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.text,
    lineHeight: 20,
  },
  agreeRequired: {
    color: C.pink,
    fontFamily: FONTS.bodySemibold,
  },
  viewBtn: {
    paddingHorizontal: S[2],
    paddingVertical: S[1],
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.line,
  },
  viewBtnText: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
  ctaWrap: {
    paddingHorizontal: S[5],
    paddingBottom: S[6],
  },
});

const cbStyles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxBig: {
    width: 26,
    height: 26,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    borderColor: C.pink,
    backgroundColor: `${C.pink}22`,
  },
  check: {
    fontSize: 12,
    color: C.pink,
    fontFamily: FONTS.bodyBold,
  },
  checkBig: {
    fontSize: 14,
    color: C.pink,
    fontFamily: FONTS.bodyBold,
  },
});
