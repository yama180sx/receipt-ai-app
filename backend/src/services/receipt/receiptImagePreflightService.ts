import sharp from 'sharp';
import type { ParsedReceipt } from '../../types/receipt';
import { AppError } from '../../utils/appError';

const MIN_RECEIPT_IMAGE_DIMENSION = 120;
// 完全な白紙・黒紙などを止めるための閾値。薄い印字のレシートを誤拒否しないよう低く保つ。
const MIN_VISUAL_STANDARD_DEVIATION = 1.5;

type ImagePreflightResult = {
  width: number;
  height: number;
  visualStandardDeviation: number;
};

/**
 * AI へ送る前の、費用を発生させない画像品質の最低限の検査。
 *
 * これはレシートか否かを画像認識する機能ではない。ほぼ単色の白紙・黒紙と、
 * 画像として読めないデータだけを保守的に拒否する。
 */
export async function assertReceiptImageCanBeAnalyzed(buffer: Buffer): Promise<ImagePreflightResult> {
  try {
    const image = sharp(buffer, { failOn: 'error' }).rotate();
    const [metadata, statistics] = await Promise.all([image.metadata(), image.stats()]);
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width < MIN_RECEIPT_IMAGE_DIMENSION || height < MIN_RECEIPT_IMAGE_DIMENSION) {
      throw new AppError(
        '画像が小さすぎるためレシートを確認できません。レシート全体が写るように再撮影してください。',
        400,
        undefined,
        'RECEIPT_IMAGE_TOO_SMALL'
      );
    }

    // alpha は透明背景の影響を受けるため、色チャンネルだけで画像内の濃淡を確認する。
    const visualStandardDeviation = Math.max(
      ...statistics.channels.slice(0, Math.min(3, statistics.channels.length)).map((channel) => channel.stdev)
    );
    if (visualStandardDeviation < MIN_VISUAL_STANDARD_DEVIATION) {
      throw new AppError(
        'レシートの文字や明細を確認できません。白紙ではない画像を撮影して再試行してください。',
        400,
        undefined,
        'RECEIPT_IMAGE_NOT_ANALYZABLE'
      );
    }

    return { width, height, visualStandardDeviation };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      '画像を読み込めません。JPEG、PNG、またはWebP形式の画像を選択してください。',
      400,
      undefined,
      'RECEIPT_IMAGE_INVALID'
    );
  }
}

/**
 * 画像の影・しわだけでは事前検査を通過する場合があるため、AI出力も最低限検査する。
 * 空の確認画面を表示せず、再撮影を促す。AI応答の形式検証とは別の業務上の妥当性検査。
 */
export function assertReceiptAnalysisContainsData(receipt: ParsedReceipt): void {
  // Gemini の実行時出力は TypeScript の型どおりとは限らないため、null も空値として扱う。
  const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const hasStoreName = hasText(receipt.storeName);
  const hasPurchaseDate = hasText(receipt.purchaseDate);
  const hasLineItem = items.some((item) => hasText(item?.name));
  const hasPositiveTotal = typeof receipt.totalAmount === 'number'
    && Number.isFinite(receipt.totalAmount)
    && receipt.totalAmount > 0;

  if (!hasStoreName && !hasPurchaseDate && !hasLineItem && !hasPositiveTotal) {
    throw new AppError(
      'レシートとして必要な情報を読み取れませんでした。レシート全体が明るく写るように再撮影してください。',
      422,
      undefined,
      'RECEIPT_ANALYSIS_EMPTY'
    );
  }
}
