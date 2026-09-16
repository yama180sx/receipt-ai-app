import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { assertReceiptImageCanBeAnalyzed } from './receiptImagePreflightService';

describe('assertReceiptImageCanBeAnalyzed', () => {
  it('rejects a nearly uniform blank image before AI analysis', async () => {
    const blank = await sharp({
      create: { width: 800, height: 1200, channels: 3, background: '#ffffff' },
    }).png().toBuffer();

    await expect(assertReceiptImageCanBeAnalyzed(blank)).rejects.toMatchObject({
      statusCode: 400,
      code: 'RECEIPT_IMAGE_NOT_ANALYZABLE',
    });
  });

  it('accepts a receipt-like image with text contrast', async () => {
    const receiptLike = await sharp(Buffer.from(`
      <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <text x="80" y="180" font-size="42" fill="black">RECEIPT</text>
        <path d="M80 230H720M80 300H720M80 370H720" stroke="black" stroke-width="8"/>
      </svg>
    `)).png().toBuffer();

    await expect(assertReceiptImageCanBeAnalyzed(receiptLike)).resolves.toMatchObject({
      width: 800,
      height: 1200,
    });
  });

  it('rejects image data that cannot be decoded', async () => {
    await expect(assertReceiptImageCanBeAnalyzed(Buffer.from('not-an-image'))).rejects.toMatchObject({
      statusCode: 400,
      code: 'RECEIPT_IMAGE_INVALID',
    });
  });
});
