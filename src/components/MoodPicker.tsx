import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import { C, FONTS, R, S } from '../theme';

export const MOODS = ['😆', '😎', '🔥', '💢', '🥺', '😤', '😭'];

interface MoodRowProps {
  mood: string;
  onSelect: (emoji: string) => void;
  chipSize?: number;
}

export function MoodRow({ mood, onSelect, chipSize = 40 }: MoodRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCustom = !MOODS.includes(mood);

  const handleEmojiSelected = (emoji: EmojiType) => {
    onSelect(emoji.emoji);
    setPickerOpen(false);
  };

  return (
    <>
      <View style={styles.row}>
        {MOODS.map((m) => (
          <Pressable
            key={m}
            onPress={() => onSelect(m)}
            style={[styles.chip, { width: chipSize, height: chipSize }, mood === m && styles.chipSelected]}
          >
            <Text style={styles.emoji}>{m}</Text>
          </Pressable>
        ))}
        {isCustom && (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.chip, { width: chipSize, height: chipSize }, styles.chipSelected]}
          >
            <Text style={styles.emoji}>{mood}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.chip, styles.chipAdd, { width: chipSize, height: chipSize }]}
        >
          <Text style={styles.plus}>+</Text>
        </Pressable>
      </View>
      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onEmojiSelected={handleEmojiSelected}
        enableSearchBar
        categoryPosition="bottom"
        theme={{
          backdrop: 'rgba(0,0,0,0.6)',
          knob: C.textMute,
          container: C.surfaceElevated,
          header: C.textDim,
          skinTonesContainer: C.surfaceDeep,
          category: {
            icon: C.textMute,
            iconActive: C.pink,
            container: C.surfaceElevated,
            containerActive: `${C.pink}22`,
          },
          search: {
            background: C.surfaceDeep,
            text: C.text,
            placeholder: C.textMute,
            icon: C.textDim,
          },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  chip: {
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceDeep,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipSelected: {
    borderColor: C.pink,
    backgroundColor: `${C.pink}22`,
  },
  chipAdd: {
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 20,
  },
  plus: {
    fontFamily: FONTS.headBold,
    fontSize: 20,
    color: C.textDim,
  },
});
