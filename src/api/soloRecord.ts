import { apiGet, apiPost } from './client';

export interface CreateSoloRecordResponse {
  success: boolean;
}

export interface FindSoloRecordResponse {
  peakDb: number;
  bestDb: number;
}

export async function createSoloRecord(peakDb: number, token: string) {
  return apiPost<CreateSoloRecordResponse>('/solo/record', { peakDb }, token);
}

export async function getSoloRecord(token: string) {
  return apiGet<FindSoloRecordResponse>('/solo/record', token);
}
