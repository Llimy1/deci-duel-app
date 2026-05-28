import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, FONTS, FS, R, S } from '../../theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CodeBoxes({ value, onChange }: Props) {
  const inputRef = useRef<TextInput>(null);
  const chars = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleChange = (next: string) => {
    onChange(next.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        keyboardType="ascii-capable"
        style={styles.hiddenInput}
      />
      {chars.map((char, index) => {
        const filled = char !== ' ';
        const active = index === value.length;
        return (
          <View key={index} style={[styles.box, filled && styles.filledBox, active && styles.activeBox]}>
            <Text style={styles.char}>{filled ? char : ''}</Text>
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: S[2],
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  box: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bgElev,
  },
  filledBox: {
    borderColor: `${C.cyan}88`,
    backgroundColor: C.surface2,
  },
  activeBox: {
    borderColor: C.cyan,
    borderStyle: 'dashed',
  },
  char: {
    fontFamily: FONTS.monoBold,
    fontSize: FS.xl,
    color: C.text,
  },
});
