import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export interface DiaryEntryResponse {
  date: string;
  peakDb: number;
  emoji: string;
  comment: string | null;
}

export interface CreateDiaryResponse {
  success: boolean;
}

export interface UpdateDiaryResponse {
  success: boolean;
}

export interface DeleteDiaryResponse {
  success: boolean;
}

export interface FindMonthlyDiaryResponse {
  entries: DiaryEntryResponse[];
}

export interface FindDiaryByDateResponse extends DiaryEntryResponse {}

export async function createDiary(
  entry: { peakDb: number; emoji: string; date: string; comment: string },
  token: string
) {
  return apiPost<CreateDiaryResponse>('/diary', entry, token);
}

export async function getMonthlyDiary(year: number, month: number, token: string) {
  return apiGet<FindMonthlyDiaryResponse>(`/diary?year=${year}&month=${month}`, token);
}

export async function getDiaryByDate(date: string, token: string) {
  return apiGet<FindDiaryByDateResponse>(`/diary/${date}`, token);
}

export async function updateDiary(
  date: string,
  entry: { emoji: string; comment: string },
  token: string
) {
  return apiPatch<UpdateDiaryResponse>(`/diary/${date}`, entry, token);
}

export async function deleteDiary(date: string, token: string) {
  return apiDelete<DeleteDiaryResponse>(`/diary/${date}`, token);
}
