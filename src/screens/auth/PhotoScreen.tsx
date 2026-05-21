import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { C, FONTS, FS, S, R } from '../../theme';
import { Btn, Av } from '../../components/ui';
import { useAppStore } from '../../store';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Photo'>;

const SWATCHES = [C.pink, C.cyan, C.yellow, C.lime, C.purple];

export default function PhotoScreen({ navigation }: Props) {
  const nickname = useAppStore((s) => s.nickname);
  const avatarColor = useAppStore((s) => s.avatarColor);
  const setAuth = useAppStore((s) => s.setAuth);
  const { height, width } = useWindowDimensions();
  const [selectedColor, setSelectedColor] = useState(avatarColor);
  const compact = height < 740;
  const narrow = width < 380;

  const handleContinue = () => {
    setAuth(nickname, selectedColor);
    navigation.navigate('MicPermission');
  };

  const handleSkip = () => {
    navigation.navigate('MicPermission');
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
        <Text style={styles.label}>아바타</Text>
        <Text style={[styles.heading, narrow && styles.headingNarrow]}>컬러 골라.</Text>

        <View style={[styles.avatarCanvas, compact && styles.avatarCanvasCompact]}>
          <Av name={nickname} size={compact ? 108 : 130} color={selectedColor} />
        </View>

        <View style={styles.swatchRow}>
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
        </View>

        <Pressable style={styles.galleryBtn}>
          <Text style={styles.galleryBtnText}>+ 갤러리에서 사진 가져오기</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.ctaRow}>
        <Btn variant="ghost" size="lg" onPress={handleSkip} style={{ flex: 1 }}>
          건너뛰기
        </Btn>
        <Btn variant="primary" size="lg" onPress={handleContinue} style={{ flex: 2 }}>
          계속
        </Btn>
      </View>
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
    height: 220,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[6],
  },
  avatarCanvasCompact: {
    height: 170,
    marginBottom: S[5],
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: S[5],
  },
  swatch: {
    flex: 1,
    height: 44,
    borderRadius: R.md,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: C.text,
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
    fontFamily: FONTS.body,
    fontSize: FS.md,
    color: C.textDim,
  },
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: S[5],
    paddingBottom: S[6],
    gap: 10,
  },
});
