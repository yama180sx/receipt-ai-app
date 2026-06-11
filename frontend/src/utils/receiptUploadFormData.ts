import { Platform } from 'react-native';
import { takeWebImageFile, uriToWebImageFile } from './webImageFileRegistry';

/**
 * レシート画像アップロード用 FormData。
 * Web では File/Blob が必要（RN 形式 { uri, name, type } は multer に届かない）。
 */
export async function buildReceiptUploadFormData(
  imageUri: string,
  memberId: number
): Promise<FormData> {
  const formData = new FormData();
  formData.append('memberId', memberId.toString());

  if (Platform.OS === 'web') {
    const cached = takeWebImageFile(imageUri);
    const file = cached ?? (await uriToWebImageFile(imageUri));
    formData.append('image', file);
    return formData;
  }

  const uriParts = imageUri.split('.');
  const fileType = uriParts[uriParts.length - 1] || 'jpg';
  // @ts-ignore — React Native FormData blob
  formData.append('image', {
    uri: imageUri,
    name: `receipt_upload.${fileType}`,
    type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
  });
  return formData;
}
