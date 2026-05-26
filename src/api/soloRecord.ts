import { apiGet, apiPost } from './client';

export interface CreateSoloRecordResponse {
  success: boolean;
}

export interface FindSoloRecordResponse {
  peakDb: number;
  bestDb: number;
}

export async function createSoloRecord(peakDb: number) {
  return apiPost<CreateSoloRecordResponse>('/solo/record', { peakDb });
}

export async function getSoloRecord() {
  return apiGet<FindSoloRecordResponse>('/solo/record');
}
