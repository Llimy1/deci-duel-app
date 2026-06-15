import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDiary, deleteDiary, DiaryEntryResponse, getMonthlyDiary, updateDiary } from '../api/diary';
import { showErrorAlert } from '../utils/errorHandler';
import { Toast } from '../utils/toast';
import { deleteRecording } from '../utils/audioStorage';
import { useAppStore } from './index';

export interface DiaryEntry {
  date: string;
  db: number;
  mood: string;
  comment: string;
  /** 솔로 측정 녹음 파일의 로컬 경로 (서버 동기화 대상 아님) */
  audioUri?: string;
}

interface DiaryState {
  entries: Record<string, DiaryEntry>;
  /** date → 로컬 녹음 파일 경로. 서버 동기화로 entries가 갈아치워져도 보존된다. */
  audioMap: Record<string, string>;
  loaded: boolean;
  loadEntries: (year?: number, month?: number) => Promise<void>;
  saveEntry: (entry: DiaryEntry) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
}

const STORAGE_KEY = 'deci_diary_entries';
const AUDIO_MAP_KEY = 'deci_diary_audio_map';

function fromApiEntry(entry: DiaryEntryResponse): DiaryEntry {
  return {
    date: entry.date,
    db: entry.peakDb,
    mood: entry.emoji,
    comment: entry.comment ?? '',
  };
}

function isSameMonth(date: string, year: number, month: number) {
  const [entryYear, entryMonth] = date.split('-').map(Number);
  return entryYear === year && entryMonth === month;
}

async function loadAudioMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(AUDIO_MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function withAudio(entry: DiaryEntry, audioMap: Record<string, string>): DiaryEntry {
  const audioUri = audioMap[entry.date];
  return audioUri ? { ...entry, audioUri } : entry;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: {},
  audioMap: {},
  loaded: false,
  loadEntries: async (year, month) => {
    const audioMap = get().loaded ? get().audioMap : await loadAudioMap();
    const token = useAppStore.getState().accessToken;
    if (token && year && month) {
      try {
        const response = await getMonthlyDiary(year, month);
        const monthlyEntries = response.data.entries.reduce<Record<string, DiaryEntry>>((acc, entry) => {
          const diaryEntry = withAudio(fromApiEntry(entry), audioMap);
          acc[diaryEntry.date] = diaryEntry;
          return acc;
        }, {});
        set((state) => {
          const entries = Object.fromEntries(
            Object.entries(state.entries).filter(([date]) => !isSameMonth(date, year, month))
          );
          return { entries: { ...entries, ...monthlyEntries }, audioMap, loaded: true };
        });
        return;
      } catch (e) {
        showErrorAlert(e, '다이어리 불러오기 실패');
      }
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Record<string, DiaryEntry>;
        const entries = Object.fromEntries(
          Object.entries(stored).map(([date, entry]) => [date, withAudio(entry, audioMap)])
        );
        set({ entries, audioMap, loaded: true });
      } else {
        set({ audioMap, loaded: true });
      }
    } catch {
      set({ audioMap, loaded: true });
    }
  },
  saveEntry: async (entry) => {
    const existed = !!get().entries[entry.date];
    const prevEntries = get().entries;
    const prevAudioMap = get().audioMap;
    const prevAudioUri = prevAudioMap[entry.date];

    const audioMap = { ...prevAudioMap };
    let nextEntry = entry;
    if (entry.audioUri) {
      audioMap[entry.date] = entry.audioUri;
    } else if (prevAudioUri) {
      // 오디오 없이 저장(코멘트/무드 수정 등) — 기존 녹음 유지
      nextEntry = { ...entry, audioUri: prevAudioUri };
    }

    set({ entries: { ...prevEntries, [entry.date]: nextEntry }, audioMap });

    const token = useAppStore.getState().accessToken;
    if (token) {
      try {
        if (existed) {
          await updateDiary(entry.date, { emoji: entry.mood, comment: entry.comment });
          Toast.success('다이어리를 수정했어요.');
        } else {
          await createDiary({ peakDb: entry.db, emoji: entry.mood, date: entry.date, comment: entry.comment });
        }
      } catch (e) {
        set({ entries: prevEntries, audioMap: prevAudioMap }); // 낙관적 업데이트 롤백
        if (entry.audioUri && entry.audioUri !== prevAudioUri) {
          deleteRecording(entry.audioUri); // 롤백으로 고아가 된 신규 녹음 파일 정리
        }
        showErrorAlert(e, '다이어리 저장 실패');
        return; // AsyncStorage에 실패한 상태 저장 방지
      }
    }

    // 새 녹음이 이전 녹음을 대체했다면 이전 파일 정리
    if (entry.audioUri && prevAudioUri && prevAudioUri !== entry.audioUri) {
      deleteRecording(prevAudioUri);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().entries));
      await AsyncStorage.setItem(AUDIO_MAP_KEY, JSON.stringify(get().audioMap));
    } catch {}
  },
  deleteEntry: async (date) => {
    const prevEntries = get().entries;
    const prevAudioMap = get().audioMap;
    const entries = { ...prevEntries };
    delete entries[date];
    const audioMap = { ...prevAudioMap };
    const audioUri = audioMap[date];
    delete audioMap[date];
    set({ entries, audioMap });

    const token = useAppStore.getState().accessToken;
    if (token) {
      try {
        await deleteDiary(date);
        Toast.success('다이어리를 삭제했어요.');
      } catch (e) {
        set({ entries: prevEntries, audioMap: prevAudioMap });
        showErrorAlert(e, '다이어리 삭제 실패');
        return;
      }
    }

    if (audioUri) {
      deleteRecording(audioUri);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().entries));
      await AsyncStorage.setItem(AUDIO_MAP_KEY, JSON.stringify(get().audioMap));
    } catch {}
  },
}));
