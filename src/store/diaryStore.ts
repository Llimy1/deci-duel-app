import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDiary, deleteDiary, DiaryEntryResponse, getMonthlyDiary, updateDiary } from '../api/diary';
import { showErrorAlert } from '../utils/errorHandler';
import { Toast } from '../utils/toast';
import { useAppStore } from './index';

export interface DiaryEntry {
  date: string;
  db: number;
  mood: string;
  comment: string;
}

interface DiaryState {
  entries: Record<string, DiaryEntry>;
  loaded: boolean;
  loadEntries: (year?: number, month?: number) => Promise<void>;
  saveEntry: (entry: DiaryEntry) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
}

const STORAGE_KEY = 'deci_diary_entries';

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

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: {},
  loaded: false,
  loadEntries: async (year, month) => {
    const token = useAppStore.getState().accessToken;
    if (token && year && month) {
      try {
        const response = await getMonthlyDiary(year, month);
        const monthlyEntries = response.data.entries.reduce<Record<string, DiaryEntry>>((acc, entry) => {
          const diaryEntry = fromApiEntry(entry);
          acc[diaryEntry.date] = diaryEntry;
          return acc;
        }, {});
        set((state) => {
          const entries = Object.fromEntries(
            Object.entries(state.entries).filter(([date]) => !isSameMonth(date, year, month))
          );
          return { entries: { ...entries, ...monthlyEntries }, loaded: true };
        });
        return;
      } catch (e) {
        showErrorAlert(e, '다이어리 불러오기 실패');
      }
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const entries = JSON.parse(raw) as Record<string, DiaryEntry>;
        set({ entries, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
  saveEntry: async (entry) => {
    const existed = !!get().entries[entry.date];
    const prevEntries = get().entries;
    set({ entries: { ...prevEntries, [entry.date]: entry } });

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
        set({ entries: prevEntries }); // 낙관적 업데이트 롤백
        showErrorAlert(e, '다이어리 저장 실패');
        return; // AsyncStorage에 실패한 상태 저장 방지
      }
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().entries));
    } catch {}
  },
  deleteEntry: async (date) => {
    const prevEntries = get().entries;
    const entries = { ...prevEntries };
    delete entries[date];
    set({ entries });

    const token = useAppStore.getState().accessToken;
    if (token) {
      try {
        await deleteDiary(date);
        Toast.success('다이어리를 삭제했어요.');
      } catch (e) {
        set({ entries: prevEntries });
        showErrorAlert(e, '다이어리 삭제 실패');
        return;
      }
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().entries));
    } catch {}
  },
}));
