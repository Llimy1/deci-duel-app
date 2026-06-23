import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export interface Me {
  id: number;
  nickname: string;
  avatarColor: string;
  profileImageUrl: string | null;
  streak: number;
  wins: number;
  losses: number;
  bestDb: number;
  createdAt: string;
  termsVersion: string | null;
  privacyVersion: string | null;
}

export interface ProfileImageAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

export async function fetchMe(): Promise<Me> {
  const response = await apiGet<Me>('/user/me');
  return response.data;
}

export async function updateNickname(nickname: string): Promise<string> {
  const response = await apiPatch<{ nickname: string }>('/user/me/nickname', { nickname });
  return response.data.nickname;
}

export async function updateAvatarColor(avatarColor: string): Promise<string> {
  const response = await apiPatch<{ avatarColor: string }>('/user/me/avatar-color', { avatarColor });
  return response.data.avatarColor;
}

export async function updateConsent(termsVersion: string, privacyVersion: string): Promise<void> {
  await apiPatch<{ termsVersion: string; privacyVersion: string }>('/user/me/consent', {
    termsVersion,
    privacyVersion,
  });
}

export async function logoutFromServer(): Promise<void> {
  await apiPost<null>('/auth/logout', {});
}

export async function deleteAccount(): Promise<void> {
  await apiDelete<null>('/user/me');
}

export async function uploadProfileImageFromUri(
  uri: string,
  fileName = 'profile.jpg',
  mimeType = 'image/jpeg'
): Promise<string> {
  const form = new FormData();
  form.append('image', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);

  const response = await apiPost<{ profileImageUrl: string }>('/user/me/profile-image', form);
  return response.data.profileImageUrl;
}

export async function pickProfileImageAsset(): Promise<ProfileImageAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? 'profile.jpg',
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function pickAndUploadProfileImage(): Promise<string | null> {
  const asset = await pickProfileImageAsset();
  if (!asset) return null;
  return uploadProfileImageFromUri(asset.uri, asset.fileName, asset.mimeType);
}

export async function generateAndUploadRandomProfileImage(seed: string): Promise<string> {
  const safeSeed = encodeURIComponent(`${seed || 'deci-duel'}-${Date.now()}`);
  const url = `https://api.dicebear.com/9.x/pixel-art/png?seed=${safeSeed}&backgroundColor=0a0612,1c0e2e,261444`;
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('임시 저장소를 사용할 수 없습니다.');
  }

  const targetUri = `${cacheDirectory}deci-profile-${Date.now()}.png`;
  const downloaded = await FileSystem.downloadAsync(url, targetUri);

  return uploadProfileImageFromUri(downloaded.uri, 'profile.png', 'image/png');
}
