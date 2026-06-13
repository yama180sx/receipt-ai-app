export type ContainedLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
};

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** resizeMode="contain" 時の画像表示領域を算出 */
export function computeContainedLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ContainedLayout {
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  return {
    scale,
    offsetX: (containerWidth - renderedWidth) / 2,
    offsetY: (containerHeight - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  };
}

/** コンテナ座標の選択範囲 → 原画像ピクセル座標 */
export function mapSelectionToCrop(
  selection: SelectionRect,
  layout: ContainedLayout,
  imageWidth: number,
  imageHeight: number
): CropRect | null {
  const x1 = Math.max(selection.x, layout.offsetX);
  const y1 = Math.max(selection.y, layout.offsetY);
  const x2 = Math.min(selection.x + selection.width, layout.offsetX + layout.renderedWidth);
  const y2 = Math.min(selection.y + selection.height, layout.offsetY + layout.renderedHeight);

  if (x2 - x1 < 2 || y2 - y1 < 2) return null;

  const originX = Math.round((x1 - layout.offsetX) / layout.scale);
  const originY = Math.round((y1 - layout.offsetY) / layout.scale);
  const width = Math.round((x2 - x1) / layout.scale);
  const height = Math.round((y2 - y1) / layout.scale);

  const clampedX = Math.max(0, Math.min(originX, imageWidth - 1));
  const clampedY = Math.max(0, Math.min(originY, imageHeight - 1));

  return {
    originX: clampedX,
    originY: clampedY,
    width: Math.max(1, Math.min(width, imageWidth - clampedX)),
    height: Math.max(1, Math.min(height, imageHeight - clampedY)),
  };
}

export function loadImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = uri;
  });
}

function loadHtmlImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = uri;
  });
}

/** Web: Canvas で切り取り → blob URL */
export async function cropImageUriWeb(imageUri: string, crop: CropRect): Promise<string> {
  const img = await loadHtmlImage(imageUri);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas が利用できません');

  ctx.drawImage(
    img,
    crop.originX,
    crop.originY,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.85);
  });
  if (!blob) throw new Error('切り取りに失敗しました');
  return URL.createObjectURL(blob);
}
