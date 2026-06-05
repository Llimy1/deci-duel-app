import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Av } from '../../components/ui';
import { useAppStore } from '../../store';
import { completeOAuthSignup } from '../../api/oauth';
import {
  generateAndUploadRandomProfileImage,
  pickProfileImageAsset,
  ProfileImageAsset,
  uploadProfileImageFromUri,
} from '../../api/me';
import { saveTokens } from '../../utils/secureStorage';
import { getErrorMessage } from '../../utils/errorHandler';
import { Toast } from '../../utils/toast';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Photo'>;

export default function PhotoScreen({ navigation, route }: Props) {
  const { termsVersion, privacyVersion } = route.params;
  const nickname = useAppStore((s) => s.nickname);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const accessToken = useAppStore((s) => s.accessToken);
  const setTokens = useAppStore((s) => s.setTokens);
  const setProfileImageUrl = useAppStore((s) => s.setProfileImageUrl);
  const pendingOAuthSignup = useAppStore((s) => s.pendingOAuthSignup);
  const clearPendingOAuthSignup = useAppStore((s) => s.clearPendingOAuthSignup);
  const { height, width } = useWindowDimensions();
  const [selectedAsset, setSelectedAsset] = useState<ProfileImageAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const compact = height < 740;
  const narrow = width < 380;

  const ensureAccountSession = async () => {
    if (!pendingOAuthSignup) return;

    const result = await completeOAuthSignup(
      pendingOAuthSignup.signupToken,
      nickname,
      termsVersion,
      privacyVersion,
    );
    await saveTokens(result.accessToken, result.refreshToken);
    setTokens(result.accessToken, result.refreshToken, result.user.id);
  };

  const finishOnboarding = async (profileImageUrl?: string) => {
    if (profileImageUrl) setProfileImageUrl(profileImageUrl);
    clearPendingOAuthSignup();
    navigation.navigate('MicTest');
  };

  const handlePickImage = async () => {
    try {
      const asset = await pickProfileImageAsset();
      if (!asset) {
        Toast.info('이미지 선택을 취소했습니다.');
        return;
      }
      setSelectedAsset(asset);
    } catch (e) {
      Toast.error(getErrorMessage(e));
    }
  };

  const handleContinue = async () => {
    if (!selectedAsset || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ensureAccountSession();
      const profileImageUrl = await uploadProfileImageFromUri(
        selectedAsset.uri,
        selectedAsset.fileName,
        selectedAsset.mimeType
      );
      await finishOnboarding(profileImageUrl);
    } catch (e) {
      Toast.error(getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ensureAccountSession();
      const profileImageUrl = accessToken || pendingOAuthSignup
        ? await generateAndUploadRandomProfileImage(nickname)
        : undefined;
      await finishOnboarding(profileImageUrl);
    } catch (e) {
      Toast.error(getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.step}>03 / 04</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { minHeight: height * 0.72 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>프로필</Text>
        <Text style={[styles.heading, narrow && styles.headingNarrow]}>
          프로필 사진을 설정해보세요.
        </Text>

        <View style={[styles.avatarCanvas, compact && styles.avatarCanvasCompact]}>
          <Av
            name={nickname || 'D'}
            size={compact ? 116 : 140}
            color={avatarColor}
            profileImageUrl={selectedAsset?.uri}
            ring
          />
          <Text style={styles.previewHint}>
            {selectedAsset ? '선택한 사진이 적용됩니다.' : '사진이 없으면 랜덤 이미지가 생성됩니다.'}
          </Text>
        </View>

        <Pressable onPress={handlePickImage} style={styles.galleryBtn}>
          <Text style={styles.galleryBtnText}>사진 선택</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={handleSkip}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.bottomBtn,
            styles.skipBtn,
            { opacity: isSubmitting ? 0.45 : pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.skipBtnText}>건너뛰기</Text>
        </Pressable>
        <Pressable
          onPress={handleContinue}
          disabled={!selectedAsset || isSubmitting}
          style={({ pressed }) => [
            styles.bottomBtn,
            styles.nextBtn,
            (!selectedAsset || isSubmitting) && styles.disabledBtn,
            { opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={styles.nextBtnText}>다음</Text>
        </Pressable>
      </View>

      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={C.pink} />
          <Text style={styles.loadingText}>프로필 저장 중</Text>
        </View>
      )}
    </SafeAreaView>
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
    lineHeight: 40,
    letterSpacing: -0.5,
    color: C.text,
    marginBottom: S[6],
  },
  headingNarrow: {
    fontSize: 30,
    lineHeight: 36,
  },
  avatarCanvas: {
    minHeight: 250,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[4],
    marginBottom: S[5],
  },
  avatarCanvasCompact: {
    minHeight: 200,
    marginBottom: S[4],
  },
  previewHint: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    color: C.textDim,
  },
  galleryBtn: {
    height: 52,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.md,
    color: C.text,
  },
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: S[5],
    paddingBottom: S[6],
    gap: 10,
  },
  bottomBtn: {
    height: 56,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  nextBtn: {
    flex: 1.7,
    backgroundColor: C.pink,
  },
  disabledBtn: {
    backgroundColor: C.surface2,
  },
  skipBtnText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  nextBtnText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,6,18,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[3],
  },
  loadingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.text,
  },
});
