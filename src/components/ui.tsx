import React from 'react';
import {
  Image, View, Text, Pressable, StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, FONTS, R, S, FS, gradHot, gradCool } from '../theme';

// ── Button ──────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'cyan' | 'yellow' | 'ghost' | 'outline' | 'glass';
type BtnSize = 'sm' | 'md' | 'lg' | 'xl';

interface BtnProps {
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  full?: boolean;
}

const BTN_SIZES: Record<BtnSize, { h: number; fs: number; px: number }> = {
  sm: { h: 38, fs: FS.sm, px: 14 },
  md: { h: 48, fs: FS.md, px: 18 },
  lg: { h: 58, fs: FS.lg, px: 24 },
  xl: { h: 68, fs: FS.xl, px: 28 },
};

export function Btn({ children, variant = 'primary', size = 'md', onPress, style, disabled, full }: BtnProps) {
  const sz = BTN_SIZES[size];
  const isGradient = variant === 'primary' || variant === 'cyan';
  const gradColors = variant === 'cyan' ? gradCool : gradHot;

  const flatBg: Record<BtnVariant, string> = {
    primary: C.pink,
    cyan: C.cyan,
    yellow: C.yellow,
    ghost: 'rgba(255,255,255,0.06)',
    outline: 'transparent',
    glass: 'rgba(255,255,255,0.08)',
  };

  const textColor: Record<BtnVariant, string> = {
    primary: '#fff',
    cyan: '#06121a',
    yellow: '#1a0e00',
    ghost: '#fff',
    outline: '#fff',
    glass: '#fff',
  };

  const border: Record<BtnVariant, string | undefined> = {
    primary: undefined,
    cyan: undefined,
    yellow: undefined,
    ghost: 'rgba(255,255,255,0.14)',
    outline: C.pink,
    glass: 'rgba(255,255,255,0.18)',
  };

  const inner = (
    <View style={[{
      height: sz.h,
      paddingHorizontal: sz.px,
      borderRadius: R.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: S[2],
      width: full ? '100%' : undefined,
      borderWidth: border[variant] ? 1 : 0,
      borderColor: border[variant] ?? 'transparent',
      backgroundColor: isGradient ? 'transparent' : flatBg[variant],
    }, style]}>
      <Text style={{
        fontFamily: FONTS.headBold,
        fontSize: sz.fs,
        color: textColor[variant],
        letterSpacing: 0.2,
      }}>{children}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.88 : 1 }]}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{
            height: sz.h,
            paddingHorizontal: sz.px,
            borderRadius: R.pill,
            alignItems: 'center',
            justifyContent: 'center',
            width: full ? '100%' : undefined,
          }, style]}
        >
          <Text style={{
            fontFamily: FONTS.headBold,
            fontSize: sz.fs,
            color: textColor[variant],
            letterSpacing: 0.2,
          }}>{children}</Text>
        </LinearGradient>
      ) : inner}
    </Pressable>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: string;
  padding?: number;
}

export function Card({ children, style, accent, padding = 16 }: CardProps) {
  return (
    <View style={[{
      backgroundColor: C.surface,
      borderRadius: R.lg,
      padding,
      borderWidth: 1,
      borderColor: accent ? `${accent}66` : C.line,
    }, style]}>
      {children}
    </View>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────
interface ChipProps {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
}

export function Chip({ children, color, style }: ChipProps) {
  const c = color ?? C.cyan;
  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: R.pill,
      backgroundColor: `${c}1a`,
      borderWidth: 1,
      borderColor: `${c}44`,
    }, style]}>
      <Text style={{
        fontFamily: FONTS.mono,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.4,
        color: c,
      }}>{children}</Text>
    </View>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────
const AV_COLORS = [C.pink, C.cyan, C.yellow, C.lime, C.purple];

interface AvProps {
  name: string;
  size?: number;
  color?: string;
  profileImageUrl?: string | null;
  ring?: boolean;
  style?: ViewStyle;
}

export function Av({ name, size = 44, color, profileImageUrl, ring, style }: AvProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const idx = (name.charCodeAt(0) || 0) % AV_COLORS.length;
  const bg = color ?? AV_COLORS[idx];
  const showImage = !!profileImageUrl && !imageFailed;

  React.useEffect(() => {
    setImageFailed(false);
  }, [profileImageUrl]);

  return (
    <View style={[{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: ring ? 2 : 0,
      borderColor: ring ? bg : 'transparent',
      flexShrink: 0,
      overflow: 'hidden',
    }, style]}>
      {showImage ? (
        <Image
          source={{ uri: profileImageUrl }}
          onError={() => setImageFailed(true)}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text style={{
          fontFamily: FONTS.headBold,
          fontSize: size * 0.42,
          color: '#0a0612',
          fontWeight: '800',
        }}>{(name[0] || 'D').toUpperCase()}</Text>
      )}
    </View>
  );
}

// ── StageBg ──────────────────────────────────────────────────────────────────
interface StageBgProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function StageBg({ children, style }: StageBgProps) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.bg }, style]}>
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <View style={{
          position: 'absolute', top: -100, left: -100,
          width: 300, height: 300, borderRadius: 150,
          backgroundColor: `${C.purple}44`,
          opacity: 0.5,
        }} />
        <View style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 250, height: 250, borderRadius: 125,
          backgroundColor: `${C.pink}22`,
          opacity: 0.4,
        }} />
      </View>
      {children}
    </View>
  );
}

// ── Row / Stack helpers ──────────────────────────────────────────────────────
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}
