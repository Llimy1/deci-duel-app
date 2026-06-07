import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Av } from '../../components/ui';
import { useAppStore } from '../../store';
import { pickAndUploadProfileImage } from '../../api/me';
import type { ProfileStackParamList } from '../../navigation/types';
import { Toast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/errorHandler';
import { fetchMeWithRetry } from '../../utils/profileHydration';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const setMe = useAppStore((s) => s.setMe);
  const setProfileImageUrl = useAppStore((s) => s.setProfileImageUrl);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);
  const profileLoadingRef = useRef(false);

  const refreshProfile = useCallback(async (showToast = false) => {
    if (profileLoadingRef.current) return;
    profileLoadingRef.current = true;
    setIsRetryingProfile(true);
    try {
      const me = await fetchMeWithRetry();
      setMe(me);
      setProfileLoadFailed(false);
      if (showToast) Toast.success('프로필 정보를 다시 불러왔습니다.');
    } catch {
      setProfileLoadFailed(true);
      if (showToast) {
        Toast.error('프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      profileLoadingRef.current = false;
      setIsRetryingProfile(false);
    }
  }, [setMe]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const links = [
    { label: '업적', screen: 'Achievements' as const },
    { label: '데일리 챌린지', screen: 'DailyChallenge' as const },
    { label: '히스토리', screen: 'History' as const },
  ];

  const handleAvatarPress = async () => {
    try {
      const profileImageUrl = await pickAndUploadProfileImage();
      if (!profileImageUrl) return;
      setProfileImageUrl(profileImageUrl);
      Toast.success('프로필 이미지가 변경되었습니다.');
    } catch (e) {
      Toast.error(getErrorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Pressable onPress={handleAvatarPress}>
            <Av name={user.name} size={88} color={avatarColor} profileImageUrl={user.profileImageUrl} ring />
          </Pressable>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.bestDb}>{user.bestDb > 0 ? `${user.bestDb.toFixed(2)} dB` : '기록 없음'}</Text>
        </View>

        {profileLoadFailed && (
          <Pressable
            onPress={() => refreshProfile(true)}
            disabled={isRetryingProfile}
            style={({ pressed }) => [
              styles.retryPanel,
              { opacity: pressed || isRetryingProfile ? 0.78 : 1 },
            ]}
          >
            <View style={styles.retryTextWrap}>
              <Text style={styles.retryTitle}>프로필 정보를 불러오지 못했습니다.</Text>
              <Text style={styles.retrySub}>내 기록과 프로필을 다시 가져옵니다.</Text>
            </View>
            <Text style={styles.retryAction}>
              {isRetryingProfile ? '불러오는 중' : '다시 불러오기'}
            </Text>
          </Pressable>
        )}

        <View style={styles.linkList}>
          {links.map((l) => (
            <Pressable
              key={l.label}
              onPress={() => navigation.navigate(l.screen)}
              style={({ pressed }) => [styles.linkItem, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.linkText}>{l.label}</Text>
              <Text style={styles.linkArrow}>›</Text>
            </Pressable>
          ))}

          <Pressable onPress={() => navigation.navigate('Settings')} style={({ pressed }) => [styles.linkItem, styles.logoutItem, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.linkText, { color: C.pink }]}>설정</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingBottom: S[8],
    gap: S[5],
  },
  hero: {
    alignItems: 'center',
    paddingTop: S[6],
    gap: S[3],
  },
  userName: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
    marginTop: S[2],
    letterSpacing: -0.5,
  },
  bestDb: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    marginTop: S[1],
  },
  retryPanel: {
    marginHorizontal: S[5],
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: `${C.yellow}88`,
    backgroundColor: `${C.yellow}14`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  retryTextWrap: {
    flex: 1,
    gap: 2,
  },
  retryTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FS.sm,
    color: C.text,
  },
  retrySub: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textDim,
  },
  retryAction: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.yellow,
  },
  linkList: {
    marginHorizontal: S[5],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  linkText: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  linkArrow: {
    fontSize: 20,
    color: C.textMute,
    fontFamily: FONTS.headBold,
  },
});
