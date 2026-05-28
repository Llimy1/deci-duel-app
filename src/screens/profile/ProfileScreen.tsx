import React, { useCallback } from 'react';
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
import { Av, Row } from '../../components/ui';
import { useAppStore } from '../../store';
import { fetchMe, pickAndUploadProfileImage } from '../../api/me';
import type { ProfileStackParamList } from '../../navigation/types';
import { Toast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/errorHandler';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const setMe = useAppStore((s) => s.setMe);
  const setProfileImageUrl = useAppStore((s) => s.setProfileImageUrl);

  useFocusEffect(
    useCallback(() => {
      fetchMe().then(setMe).catch(() => {});
    }, [setMe])
  );

  const totalMatches = user.wins + user.losses;
  const winRate = totalMatches === 0 ? 0 : Math.round((user.wins / totalMatches) * 100);

  const stats = [
    { label: '승', value: `${user.wins}`, color: C.lime },
    { label: '패', value: `${user.losses}`, color: C.pink },
    { label: '승률', value: `${winRate}%`, color: C.cyan },
    { label: '연승', value: `${user.streak}`, color: C.yellow },
  ];

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

        </View>

        <Row style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Row>

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
  statsRow: {
    marginHorizontal: S[5],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S[4],
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: S[1],
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: FS.xl,
  },
  statLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
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
