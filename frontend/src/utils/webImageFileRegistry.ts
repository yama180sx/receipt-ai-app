/** Web 専用: blob/data URI → File の一時保持（FormData アップロード用） */
const filesByUri = new Map<string, File>();

export function registerWebImageFile(uri: string, file: File): void {
  filesByUri.set(uri, file);
}

export function takeWebImageFile(uri: string): File | undefined {
  const file = filesByUri.get(uri);
  if (file) {
    filesByUri.delete(uri);
  }
  return file;
}

export async function uriToWebImageFile(
  uri: string,
  filename = 'receipt_upload.jpg'
): Promise<File> {
  const cached = takeWebImageFile(uri);
  if (cached) return cached;

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`画像の読み込みに失敗しました (${response.status})`);
  }
  const blob = await response.blob();
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return new File([blob], filename.replace(/\.\w+$/, `.${ext}`), { type: mime });
}

const PENDING_CROP_KEY = '@recaipt_pending_crop_uri';

export function persistPendingCropUri(uri: string): void {
  try {
    sessionStorage.setItem(PENDING_CROP_KEY, uri);
  } catch {
    /* ignore */
  }
}

export function consumePendingCropUri(): string | null {
  try {
    const uri = sessionStorage.getItem(PENDING_CROP_KEY);
    if (uri) sessionStorage.removeItem(PENDING_CROP_KEY);
    return uri;
  } catch {
    return null;
  }
}

export function clearPendingCropUri(): void {
  try {
    sessionStorage.removeItem(PENDING_CROP_KEY);
  } catch {
    /* ignore */
  }
}
