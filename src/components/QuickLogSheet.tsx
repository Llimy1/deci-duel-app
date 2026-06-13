import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { C, FONTS, FS, S } from '../theme';
import { Btn } from './ui';
import { VizScrollWave, VizSignatureWave } from './DbViz';
import { MoodEmoji, MoodRow } from './MoodPicker';
import { useDiaryStore } from '../store/diaryStore';
import { useMicDb } from '../hooks/useMicDb';
import { Toast } from '../utils/toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialDb?: number;
}

const MAX_COMMENT = 200;

function dbColor(db: number): string {
  if (db >= 110) return C.pink;
  if (db >= 90) return C.yellow;
  return C.cyan;
}

export default function QuickLogSheet({
  visible, onClose, onSaved, initialDb,
}: Props) {
  const { width } = useWindowDimensions();
  const [measuring, setMeasuring] = useState(false);
  const [timer, setTimer] = useState(5);
  const [mood, setMood] = useState('😎');
  const [comment, setComment] = useState('');
  const saveEntry = useDiaryStore((s) => s.saveEntry);
  const mic = useMicDb();
  const resultMode = initialDb !== undefined;

  useEffect(() => {
    if (!measuring) return;
    const id = setInterval(() => {
      setTimer((t) => {
        const next = Math.max(0, parseFloat((t - 0.1).toFixed(1)));
        if (next <= 0) {
          setMeasuring(false);
          mic.stop();
        }
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [measuring, mic.stop]);

  const handleSave = () => {
    const today = new Date().toISOString().slice(0, 10);
    saveEntry({ date: today, db: Math.round(initialDb ?? (mic.peak || mic.db)), mood, comment });
    mic.reset();
    setTimer(5);
    setMeasuring(false);
    setMood('😎');
    setComment('');
    onSaved?.();
    onClose();
  };

  const handleMeasureToggle = async () => {
    if (!measuring) {
      setTimer(5);
      mic.reset();
      const started = await mic.start();
      if (!started) {
        Toast.error('마이크를 시작할 수 없습니다.');
        return;
      }
      setMeasuring(true);
    } else {
      await mic.stop();
      setMeasuring(false);
      setTimer(5);
    }
  };

  const handleClose = () => {
    mic.reset();
    setMeasuring(false);
    setTimer(5);
    onClose();
  };

  const waveWidth = Math.min(width - S[8], 300);
  const liveDb = initialDb ?? mic.db;
  const displayDb = Math.round(liveDb);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>{resultMode ? 'SAVE LOG' : 'QUICK LOG'}</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {resultMode ? (
            <View style={styles.vizWrap}>
              <View style={styles.entryDbRow}>
                <MoodEmoji emoji={mood} size={36} />
                <Text style={[styles.entryDbValue, { color: dbColor(displayDb) }]}>{displayDb}</Text>
                <Text style={styles.entryDbUnit}>dB</Text>
              </View>
              <VizSignatureWave db={displayDb} seed={new Date().toISOString().slice(0, 10)} width={waveWidth} height={84} cols={28} />
            </View>
          ) : (
            <View style={styles.vizWrap}>
              <VizScrollWave value={liveDb} width={waveWidth} height={58} cols={42} />
              <View style={styles.dbRow}>
                <Text style={styles.dbValue}>{displayDb}</Text>
                <Text style={styles.dbUnit}>dB</Text>
              </View>
              <Text style={styles.measureMeta}>
                PEAK {Math.round(mic.peak)} dB · {measuring ? `${timer.toFixed(1)}s LEFT` : 'TAP TO START'}
              </Text>
            </View>
          )}

          {!resultMode && (
            <Btn variant={measuring ? 'ghost' : 'cyan'} size="md" full onPress={handleMeasureToggle}>
              {measuring ? '측정 중지' : '측정 시작'}
            </Btn>
          )}

          <Text style={styles.sectionLabel}>무드</Text>
          <MoodRow mood={mood} onSelect={setMood} />

          <Text style={styles.sectionLabel}>코멘트</Text>
          <View>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={(t) => setComment(t.slice(0, MAX_COMMENT))}
              placeholder="오늘의 이야기를 적어보세요"
              placeholderTextColor={C.textMute}
              maxLength={MAX_COMMENT}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.commentCounter}>{comment.length}/{MAX_COMMENT}</Text>
          </View>

          <Btn variant="yellow" size="md" full onPress={handleSave} style={{ marginTop: S[2] }}>
            저장
          </Btn>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#211038',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[5],
    borderWidth: 1,
    borderColor: `${C.purple}66`,
    gap: S[2],
  },
  handle: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: `${C.textDim}99`,
    alignSelf: 'center',
    marginBottom: S[1],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: FONTS.headBold,
    fontSize: FS.xl,
    color: C.text,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: FONTS.body,
    fontSize: 32,
    lineHeight: 34,
    color: C.textDim,
  },
  vizWrap: {
    alignItems: 'center',
    gap: S[1],
    paddingTop: S[1],
  },
  dbRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: S[1],
  },
  dbValue: {
    fontFamily: FONTS.headBold,
    fontSize: 46,
    lineHeight: 54,
    color: C.textDim,
  },
  dbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.sm,
    color: C.textDim,
    paddingBottom: 8,
  },
  measureMeta: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textDim,
    letterSpacing: 1.1,
  },
  sectionLabel: {
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
    letterSpacing: 1.5,
  },
  entryDbRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  entryDbValue: {
    fontFamily: FONTS.headBold,
    fontSize: FS['3xl'],
    lineHeight: 40,
  },
  entryDbUnit: {
    fontFamily: FONTS.mono,
    fontSize: FS.md,
    color: C.textDim,
    paddingBottom: 6,
  },
  commentInput: {
    minHeight: 110,
    maxHeight: 220,
    fontFamily: FONTS.body,
    fontSize: FS.lg,
    lineHeight: FS.lg * 1.7,
    color: C.text,
    paddingTop: S[1],
    paddingRight: 56,
  },
  commentCounter: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    fontFamily: FONTS.mono,
    fontSize: FS.xs,
    color: C.textMute,
  },
});
