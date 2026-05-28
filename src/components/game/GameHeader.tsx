import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, FONTS, FS, R, S } from '../../theme';

interface Props {
  round: number;
  myScore: number;
  oppScore: number;
  isGolden?: boolean;
  total?: number;
}

export default function GameHeader({ round, myScore, oppScore, isGolden, total = 3 }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.roundPill, isGolden && styles.goldenPill]}>
        <Text style={[styles.roundText, isGolden && styles.goldenText]}>
          {isGolden ? 'GOLDEN' : `ROUND ${round}/${total}`}
        </Text>
      </View>
      <View style={styles.scoreInline}>
        <Text style={[styles.score, { color: C.pink }]}>{myScore}</Text>
        <Text style={styles.colon}>:</Text>
        <Text style={[styles.score, { color: C.cyan }]}>{oppScore}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingVertical: S[3],
  },
  roundPill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: S[1],
  },
  goldenPill: {
    paddingHorizontal: S[3],
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: `${C.yellow}66`,
    backgroundColor: `${C.yellow}12`,
  },
  roundText: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xs,
    color: C.cyan,
  },
  goldenText: {
    color: C.yellow,
  },
  scoreInline: {
    minWidth: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: S[2],
  },
  score: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 28,
  },
  colon: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: C.textDim,
    lineHeight: 28,
  },
});
