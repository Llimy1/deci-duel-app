/**
 * SplashAnimation
 *
 * 앱 시작 시 재생되는 애니메이션 스플래시 화면.
 * 디자인 출처: DeciDuel Splash Animation.html (Claude Design 핸드오프)
 *
 * 타임라인 (--T: 5400ms):
 *  0 -  540ms  D 마크 scale 0.5→2.1, opacity 0→1
 *  540 - 1404ms  D 마크 hold
 *  1404 - 2160ms  D 마크 scale 2.1→1.1, opacity 1→0
 *  1620 - 2484ms  워드마크 DECI·DUEL fade in
 *  2484 - 4860ms  워드마크 hold
 *  2700 - 3240ms  태그라인 fade in + slide up
 *  2700 - 3348ms  언더라인 scale X 0→1
 *  4860 - 5400ms  워드마크·태그라인·언더라인 fade out
 *  5400ms        onDone() 호출
 *
 * EQ 바: 5개 바가 1.15s 주기로 scaleY 0.55↔1.0 루프 (continuous)
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGrad,
  Path,
  Rect,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Design tokens ───────────────────────────────────────────
const BG     = '#0a0612';
const PINK   = '#ff2d87';
const CYAN   = '#00e5ff';
const PURPLE = '#9d4edd';

// Total animation duration (matches CSS --T: 5.4s)
const T = 5400;

// EQ bar specs: [x, y, width, fullHeight, fillGradient, startDelay]
const BARS: { x: number; y: number; w: number; h: number; fill: 'C' | 'M' | 'P'; delay: number }[] = [
  { x: 469, y: 452, w: 16, h: 120, fill: 'C', delay: 0   },
  { x: 497, y: 412, w: 16, h: 200, fill: 'C', delay: 140 },
  { x: 525, y: 362, w: 16, h: 300, fill: 'M', delay: 280 },
  { x: 553, y: 412, w: 16, h: 200, fill: 'P', delay: 140 },
  { x: 581, y: 452, w: 16, h: 120, fill: 'P', delay: 0   },
];

// Animated SVG Rect for EQ bars
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// ─── Props ────────────────────────────────────────────────────
interface Props {
  onDone: () => void;
}

export default function SplashAnimation({ onDone }: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // ── D mark animated values ──────────────────────────────────
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markScale   = useRef(new Animated.Value(0.5)).current;

  // ── Wordmark animated values ────────────────────────────────
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordScale   = useRef(new Animated.Value(0.92)).current;
  const wordTransY  = useRef(new Animated.Value(6)).current;

  // ── Tagline animated values ─────────────────────────────────
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagTransY  = useRef(new Animated.Value(10)).current;

  // ── Underline animated values ───────────────────────────────
  const ulineOpacity = useRef(new Animated.Value(0)).current;
  const ulineScaleX  = useRef(new Animated.Value(0)).current;

  // ── EQ bar animated values (0=compressed, 1=expanded) ───────
  const barAnims = useRef(BARS.map(() => new Animated.Value(0))).current;

  // ── Computed animated y/height for each bar ─────────────────
  // transform-origin: center → translate to center, scale, translate back
  const barAttrs = barAnims.map((anim, i) => {
    const { y: fy, h: fh } = BARS[i];
    const cy = fy + fh / 2;
    const ch = fh * 0.55;
    const cy2 = cy - ch / 2;
    return {
      animY: anim.interpolate({ inputRange: [0, 1], outputRange: [cy2, fy] }),
      animH: anim.interpolate({ inputRange: [0, 1], outputRange: [ch, fh] }),
    };
  });

  // ── Start animations ─────────────────────────────────────────
  useEffect(() => {
    // EQ bar loops (continuous, with initial delay per bar)
    const barLoopHandles = barAnims.map((anim, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1, duration: 575,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0, duration: 575,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      const composite = Animated.sequence([Animated.delay(BARS[i].delay), loop]);
      composite.start();
      return composite;
    });

    // ── D mark: 0 → 540ms → (hold 864ms) → 756ms fade ──────────
    //   0%  opacity:0  scale:0.5
    //  10% (540ms)   opacity:1  scale:2.1
    //  26% (1404ms)  hold
    //  40% (2160ms)  opacity:0  scale:1.1
    const markAnim = Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1, duration: 540,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(markScale, {
          toValue: 2.1, duration: 540,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(864),           // hold until 1404ms
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 0, duration: 756,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(markScale, {
          toValue: 1.1, duration: 756,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
    ]);

    // ── Wordmark: delay 1620ms, fade in 864ms, hold 2376ms, fade 540ms ──
    //  30% (1620ms) invisible
    //  46% (2484ms) visible
    //  90% (4860ms) hold
    // 100% (5400ms) fade out
    const wordAnim = Animated.sequence([
      Animated.delay(1620),
      Animated.parallel([
        Animated.timing(wordOpacity, {
          toValue: 1, duration: 864,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(wordScale, {
          toValue: 1, duration: 864,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(wordTransY, {
          toValue: 0, duration: 864,
          easing: Easing.bezier(0.5, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2376),          // hold 2484ms→4860ms
      Animated.timing(wordOpacity, {
        toValue: 0, duration: 540,
        useNativeDriver: true,
      }),
    ]);

    // ── Tagline: delay 2700ms, fade+slide in 540ms, hold 1620ms, fade 540ms ──
    //  50% (2700ms) invisible
    //  60% (3240ms) visible
    //  90% (4860ms) hold
    // 100% (5400ms) fade out
    const tagAnim = Animated.sequence([
      Animated.delay(2700),
      Animated.parallel([
        Animated.timing(tagOpacity, {
          toValue: 1, duration: 540,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(tagTransY, {
          toValue: 0, duration: 540,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1620),          // hold 3240ms→4860ms
      Animated.timing(tagOpacity, {
        toValue: 0, duration: 540,
        useNativeDriver: true,
      }),
    ]);

    // ── Underline: delay 2700ms, scale in 648ms, hold 1512ms, fade 540ms ──
    //  50% (2700ms) invisible  scaleX:0
    //  62% (3348ms) visible    scaleX:1
    //  90% (4860ms) hold
    // 100% (5400ms) fade out
    const ulineAnim = Animated.sequence([
      Animated.delay(2700),
      Animated.parallel([
        Animated.timing(ulineOpacity, {
          toValue: 1, duration: 648,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(ulineScaleX, {
          toValue: 1, duration: 648,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1512),          // hold 3348ms→4860ms
      Animated.timing(ulineOpacity, {
        toValue: 0, duration: 540,
        useNativeDriver: true,
      }),
    ]);

    // Run everything in parallel; fire onDone when all finish (at T = 5400ms)
    Animated.parallel([markAnim, wordAnim, tagAnim, ulineAnim]).start(() => {
      onDoneRef.current();
    });

    return () => {
      barLoopHandles.forEach(h => h.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Background: #0a0612 + purple/pink radial glows (SVG radial gradient) */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {/* Purple glow at 42% from top (center-ish) */}
          <RadialGradient id="rg1" cx="50%" cy="42%" r="45%" fx="50%" fy="42%">
            <Stop offset="0" stopColor={PURPLE} stopOpacity="0.27" />
            <Stop offset="1" stopColor={PURPLE} stopOpacity="0" />
          </RadialGradient>
          {/* Pink glow at 64% from top (lower center) */}
          <RadialGradient id="rg2" cx="50%" cy="64%" r="40%" fx="50%" fy="64%">
            <Stop offset="0" stopColor={PINK} stopOpacity="0.19" />
            <Stop offset="1" stopColor={PINK} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill={BG} />
        <Rect width="100" height="100" fill="url(#rg1)" />
        <Rect width="100" height="100" fill="url(#rg2)" />
      </Svg>

      {/* ── Center: D mark + wordmark (stacked, cross-fade) ── */}
      <View style={styles.lock}>
        {/* D mark */}
        <Animated.View
          style={[
            styles.markWrapper,
            {
              opacity: markOpacity,
              transform: [
                { translateX: 3 },
                { scale: markScale },
              ],
            },
          ]}
        >
          <Svg
            width={43}
            height={60}
            viewBox="356 262 356 500"
          >
            <Defs>
              {/* D body gradient: pink → purple → cyan */}
              <SvgGrad
                id="gD"
                gradientUnits="userSpaceOnUse"
                x1="372" y1="300" x2="694" y2="730"
              >
                <Stop offset="0"    stopColor="#ff2d87" />
                <Stop offset="0.52" stopColor="#9d4edd" />
                <Stop offset="1"    stopColor="#00e5ff" />
              </SvgGrad>
              {/* Cyan bar gradient (bars 0, 1) */}
              <SvgGrad id="gC" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#00e5ff" />
                <Stop offset="1" stopColor="#7af6ff" />
              </SvgGrad>
              {/* Yellow→white bar gradient (center bar 2) */}
              <SvgGrad id="gM" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#ffd400" />
                <Stop offset="1" stopColor="#ffffff" />
              </SvgGrad>
              {/* Pink bar gradient (bars 3, 4) */}
              <SvgGrad id="gP" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#ff2d87" />
                <Stop offset="1" stopColor="#ff7ab5" />
              </SvgGrad>
            </Defs>

            {/* D letterform */}
            <Path
              fillRule="evenodd"
              fill="url(#gD)"
              d="M 400 282 L 464 282 A 230 230 0 0 1 464 742 L 400 742 A 28 28 0 0 1 372 714 L 372 310 A 28 28 0 0 1 400 282 Z M 464 374 A 138 138 0 0 1 464 650 Z"
            />

            {/* EQ bars (animated y + height from center) */}
            {BARS.map((bar, i) => (
              <AnimatedRect
                key={i}
                x={bar.x}
                y={barAttrs[i].animY as any}
                width={bar.w}
                height={barAttrs[i].animH as any}
                rx={8}
                fill={
                  bar.fill === 'C' ? 'url(#gC)'
                  : bar.fill === 'M' ? 'url(#gM)'
                  : 'url(#gP)'
                }
              />
            ))}
          </Svg>
        </Animated.View>

        {/* Wordmark: DECI (pink) · DUEL (cyan) */}
        <Animated.View
          style={[
            styles.wordWrapper,
            {
              opacity: wordOpacity,
              transform: [
                { scale: wordScale },
                { translateY: wordTransY },
              ],
            },
          ]}
        >
          <Animated.Text style={styles.deciText}>DECI</Animated.Text>
          <View style={styles.wordGap} />
          <Animated.Text style={styles.duelText}>DUEL</Animated.Text>
        </Animated.View>
      </View>

      {/* ── Bottom: tagline + underline ── */}
      <View style={styles.bottom}>
        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagText,
            {
              opacity: tagOpacity,
              transform: [{ translateY: tagTransY }],
            },
          ]}
        >
          소리쳐서 이겨라
        </Animated.Text>

        {/* Underline: pink → cyan gradient, scale from center */}
        <Animated.View
          style={[
            styles.ulineWrapper,
            {
              opacity: ulineOpacity,
              transform: [{ scaleX: ulineScaleX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255,45,135,0)',
              PINK,
              CYAN,
              'rgba(0,229,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uline}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },

  // ── Lock: centered mark + wordmark overlay ─────────────────
  lock: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // height enough to contain the D mark at peak scale 2.1
    minHeight: 140,
  },

  // D mark wrapper — glow via iOS shadow
  markWrapper: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: PINK,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.53,
        shadowRadius: 16,
      },
    }),
  },

  // Wordmark row
  wordWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  deciText: {
    fontFamily: 'BowlbyOne_400Regular',
    fontSize: 40,
    lineHeight: 56,
    letterSpacing: 0,
    color: '#ff6aa9',
    textShadowColor: 'rgba(255,45,135,0.33)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  duelText: {
    fontFamily: 'BowlbyOne_400Regular',
    fontSize: 40,
    lineHeight: 56,
    letterSpacing: 0,
    color: '#4fe9ff',
    textShadowColor: 'rgba(0,229,255,0.33)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  wordGap: {
    width: 10,
  },

  // ── Bottom: tagline + underline ────────────────────────────
  bottom: {
    alignItems: 'center',
    paddingBottom: 120,
    gap: 8,
  },
  tagText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    letterSpacing: 3,
    color: '#b39bd1',
    textTransform: 'uppercase',
  },
  ulineWrapper: {
    width: 150,
  },
  uline: {
    width: 150,
    height: 2,
    borderRadius: 2,
  },
});
