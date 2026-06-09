import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { Av, Row } from '../../components/ui';
import { C, FONTS, FS, R, S } from '../../theme';
import { useAppStore } from '../../store';
import { useGameStore } from '../../store/gameStore';
import {
  deleteAccount,
  logoutFromServer,
  pickAndUploadProfileImage,
  updateAvatarColor,
  updateNickname,
} from '../../api/me';
import { clearTokens } from '../../utils/secureStorage';
import { getErrorMessage } from '../../utils/errorHandler';
import { Toast } from '../../utils/toast';
import { ONBOARDING_KEY } from '../../constants/storageKeys';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

// TODO: 효과음/진동 설정을 다시 제공할 때 아래 키와 로딩/토글 UI를 복구한다.
// const SOUND_KEY = 'deci_settings_sound_enabled';
// const HAPTIC_KEY = 'deci_settings_haptic_enabled';
const SWATCHES = [C.pink, C.cyan, C.yellow, C.lime, C.purple];

export default function SettingsScreen({ navigation }: Props) {
  const nickname = useAppStore((s) => s.nickname);
  const user = useAppStore((s) => s.user);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const logout = useAppStore((s) => s.logout);
  const disconnectSocket = useGameStore((s) => s.disconnectSocket);
  const setNickname = useAppStore((s) => s.setNickname);
  const setAvatarColor = useAppStore((s) => s.setAvatarColor);
  const setProfileImageUrl = useAppStore((s) => s.setProfileImageUrl);
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const [selectedColor, setSelectedColor] = useState(avatarColor);
  // const [soundEnabled, setSoundEnabled] = useState(true);
  // const [hapticEnabled, setHapticEnabled] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const appVersion = useMemo(() => Constants.expoConfig?.version ?? '1.0.0', []);

  // useEffect(() => {
  //   let mounted = true;
  //
  //   async function loadSettings() {
  //     const [sound, haptic] = await Promise.all([
  //       AsyncStorage.getItem(SOUND_KEY),
  //       AsyncStorage.getItem(HAPTIC_KEY),
  //     ]);
  //
  //     if (!mounted) return;
  //     if (sound !== null) setSoundEnabled(sound === 'true');
  //     if (haptic !== null) setHapticEnabled(haptic === 'true');
  //   }
  //
  //   loadSettings();
  //   return () => {
  //     mounted = false;
  //   };
  // }, []);

  useEffect(() => {
    setNicknameDraft(nickname);
  }, [nickname]);

  useEffect(() => {
    setSelectedColor(avatarColor);
  }, [avatarColor]);

  // const handleSoundToggle = async (value: boolean) => {
  //   setSoundEnabled(value);
  //   await AsyncStorage.setItem(SOUND_KEY, String(value));
  // };
  //
  // const handleHapticToggle = async (value: boolean) => {
  //   setHapticEnabled(value);
  //   await AsyncStorage.setItem(HAPTIC_KEY, String(value));
  // };

  const handleNicknameSave = async () => {
    if (isSavingNickname) return;
    setIsSavingNickname(true);
    try {
      const nextNickname = await updateNickname(nicknameDraft.trim());
      setNickname(nextNickname);
      setNicknameDraft(nextNickname);
      Toast.success('닉네임이 변경되었습니다.');
    } catch (e) {
      Toast.error(getErrorMessage(e));
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleAvatarSave = async () => {
    if (isSavingColor) return;
    setIsSavingColor(true);
    try {
      const nextColor = await updateAvatarColor(selectedColor);
      setAvatarColor(nextColor);
      setSelectedColor(nextColor);
      Toast.success('아바타 색상이 변경되었습니다.');
    } catch (e) {
      Toast.error(getErrorMessage(e));
    } finally {
      setIsSavingColor(false);
    }
  };

  const handleProfileImageChange = async () => {
    if (isUploadingImage) return;
    setIsUploadingImage(true);
    try {
      const profileImageUrl = await pickAndUploadProfileImage();
      if (!profileImageUrl) {
        Toast.info('이미지 선택을 취소했습니다.');
        return;
      }
      setProfileImageUrl(profileImageUrl);
      Toast.success('프로필 이미지가 변경되었습니다.');
    } catch (e) {
      Toast.error(getErrorMessage(e));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '현재 계정에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          // 게임 소켓이 연결 중이면 먼저 정리한다.
          disconnectSocket();
          try {
            await logoutFromServer();
          } catch {
            // 서버 로그아웃 실패와 무관하게 로컬 세션은 종료한다.
          } finally {
            await clearTokens();
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            logout();
          }
        },
      },
    ]);
  };

  const handleDeleteConfirm = () => {
    setDeleteModalVisible(false);
    Alert.alert(
      '마지막 확인',
      '정말로 탈퇴하시겠습니까?\n모든 데이터가 즉시 영구 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '네, 탈퇴합니다',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      disconnectSocket();
      await deleteAccount();
      await clearTokens();
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      logout();
    } catch (e) {
      Toast.error(getErrorMessage(e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section title="계정">
          <View style={styles.profilePreview}>
            <Av
              name={nicknameDraft || nickname || 'D'}
              size={56}
              color={selectedColor}
              profileImageUrl={user.profileImageUrl}
              ring
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewName}>{nicknameDraft || '닉네임'}</Text>
            </View>
          </View>

          <SettingsRow
            label={isUploadingImage ? '프로필 이미지 변경 중...' : '프로필 이미지 변경'}
            onPress={handleProfileImageChange}
          />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>닉네임 변경</Text>
            <Row style={styles.inputRow}>
              <TextInput
                value={nicknameDraft}
                onChangeText={setNicknameDraft}
                placeholder="새 닉네임"
                placeholderTextColor={C.textMute}
                maxLength={10}
                style={styles.input}
              />
              <Pressable onPress={handleNicknameSave} style={styles.smallAction}>
                <Text style={styles.smallActionText}>{isSavingNickname ? '저장 중' : '저장'}</Text>
              </Pressable>
            </Row>
          </View>

          <View style={[styles.fieldBlock, { borderBottomWidth: 0 }]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.fieldLabel}>아바타 색상</Text>
              <Pressable onPress={handleAvatarSave}>
                <Text style={styles.inlineAction}>{isSavingColor ? '저장 중' : '저장'}</Text>
              </Pressable>
            </Row>
            <Row style={styles.swatchRow}>
              {SWATCHES.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.swatchSelected,
                  ]}
                />
              ))}
            </Row>
          </View>
        </Section>

        {/*
        <Section title="앱 설정">
          <ToggleRow label="사운드" value={soundEnabled} onValueChange={handleSoundToggle} />
          <ToggleRow label="햅틱" value={hapticEnabled} onValueChange={handleHapticToggle} isLast />
        </Section>
        */}

        <Section title="정보">
          <InfoRow label="버전" value={appVersion} />
          <SettingsRow
            label="이용약관"
            onPress={() => Linking.openURL('https://deciduel.com/terms')}
          />
          <SettingsRow
            label="개인정보처리방침"
            onPress={() => Linking.openURL('https://deciduel.com/privacy')}
            isLast
          />
        </Section>

        <Section title="계정 관리">
          <SettingsRow label="로그아웃" tone="danger" onPress={handleLogout} />
          <SettingsRow label="회원 탈퇴" tone="danger" onPress={() => setDeleteModalVisible(true)} isLast />
        </Section>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalWarningIcon}>⚠</Text>
            <Text style={styles.modalTitle}>회원 탈퇴</Text>
            <Text style={styles.modalWarning}>이 작업은 되돌릴 수 없습니다.</Text>
            <Text style={styles.modalBody}>
              탈퇴 즉시 모든 데이터가 영구 삭제됩니다.{'\n'}계속하시겠습니까?
            </Text>
            <Row style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.modalBtn, styles.cancelModalBtn]}
              >
                <Text style={styles.cancelModalText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteConfirm}
                style={[styles.modalBtn, styles.deleteModalBtn]}
              >
                <Text style={styles.deleteModalText}>계속</Text>
              </Pressable>
            </Row>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  onPress,
  tone,
  isLast,
}: {
  label: string;
  onPress: () => void;
  tone?: 'danger';
  isLast?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowItem, isLast && styles.lastRow, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.rowLabel, tone === 'danger' && { color: C.pink }]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  isLast,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, isLast && styles.lastRow]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.switchSlot}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: C.surface2, true: `${C.pink}88` }}
          thumbColor={value ? C.pink : C.textMute}
          ios_backgroundColor={C.surface2}
          style={styles.switchControl}
        />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowItem}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: FONTS.headBold,
    fontSize: 34,
    lineHeight: 36,
    color: C.textDim,
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    paddingHorizontal: S[5],
    paddingTop: S[2],
    paddingBottom: S[10],
    gap: S[5],
  },
  section: {
    gap: S[2],
  },
  sectionTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 1.2,
  },
  sectionCard: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    padding: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  previewName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.lg,
    color: C.text,
  },
  fieldBlock: {
    padding: S[4],
    gap: S[2],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  fieldLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textDim,
  },
  inputRow: {
    gap: S[2],
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    paddingHorizontal: S[3],
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.md,
    color: C.text,
  },
  smallAction: {
    height: 44,
    paddingHorizontal: S[4],
    borderRadius: R.md,
    backgroundColor: C.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.sm,
    color: C.text,
  },
  inlineAction: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.xs,
    color: C.pink,
  },
  swatchRow: {
    gap: S[3],
    paddingTop: S[1],
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: C.text,
    transform: [{ scale: 1.08 }],
  },
  rowItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.md,
    color: C.text,
  },
  rowValue: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
  },
  toggleRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: S[4],
    paddingRight: S[3],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  switchSlot: {
    width: 52,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchControl: {
    transform: [{ scaleX: 0.86 }, { scaleY: 0.86 }],
  },
  chevron: {
    fontFamily: FONTS.headBold,
    fontSize: 20,
    color: C.textMute,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: S[5],
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  modalCard: {
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: `${C.pink}66`,
    backgroundColor: C.surface,
    padding: S[5],
    gap: S[4],
  },
  modalTitle: {
    fontFamily: FONTS.headBold,
    fontSize: FS.xl,
    color: C.pink,
    textAlign: 'center',
  },
  modalWarningIcon: {
    fontSize: 32,
    textAlign: 'center',
    color: '#ff3b30',
  },
  modalWarning: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.pink,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: FONTS.body,
    fontSize: FS.sm,
    lineHeight: 21,
    color: C.textDim,
    textAlign: 'center',
  },
  modalActions: {
    gap: S[2],
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: C.line,
  },
  deleteModalBtn: {
    backgroundColor: C.pink,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  cancelModalText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  deleteModalText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
});
