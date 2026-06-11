import { Platform } from 'react-native';

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
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`画像の読み込みに失敗しました (${response.status})`);
    }
    const blob = await response.blob();
    const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const ext = mime === 'image/png' ? 'png' : 'jpg';
    formData.append('image', new File([blob], `receipt_upload.${ext}`, { type: mime }));
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
