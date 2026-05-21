import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONTS, FS, S, R } from '../../theme';
import { Av, Btn, Row } from '../../components/ui';

interface Friend {
  name: string;
  online: boolean;
}

const MOCK_FRIENDS: Friend[] = [
  { name: '지민', online: true },
  { name: '소리왕', online: true },
  { name: '철수', online: false },
  { name: '나무', online: false },
  { name: '드래곤', online: true },
];

export default function FriendsScreen() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_FRIENDS.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>친구</Text>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="친구 검색 / 추가"
          placeholderTextColor={C.textMute}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>친구 {MOCK_FRIENDS.length}명</Text>
        {filtered.map((friend) => (
          <View key={friend.name} style={styles.friendItem}>
            <View style={styles.avatarWrap}>
              <Av name={friend.name} size={44} />
              <View style={[styles.onlineDot, { backgroundColor: friend.online ? C.lime : C.textMute }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendStatus}>{friend.online ? '온라인' : '오프라인'}</Text>
            </View>
            <Btn variant="outline" size="sm" onPress={() => {}}>도전</Btn>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  title: {
    fontFamily: FONTS.headBold,
    fontSize: FS['2xl'],
    color: C.text,
    paddingHorizontal: S[5],
    paddingTop: S[4],
    marginBottom: S[4],
    letterSpacing: -0.5,
  },
  searchWrap: {
    marginHorizontal: S[5],
    marginBottom: S[4],
  },
  searchInput: {
    height: 48,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S[4],
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.text,
  },
  list: {
    paddingHorizontal: S[5],
    gap: S[2],
    paddingBottom: S[6],
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 0,
    marginBottom: S[2],
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S[3],
    borderWidth: 1,
    borderColor: C.line,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.bg,
  },
  friendName: {
    fontFamily: FONTS.headBold,
    fontSize: FS.md,
    color: C.text,
  },
  friendStatus: {
    fontFamily: FONTS.body,
    fontSize: FS.xs,
    color: C.textMute,
    marginTop: 2,
  },
});
