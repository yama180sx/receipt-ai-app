import { describe, it, expect } from 'vitest';
import { computeContainedLayout, mapSelectionToCrop } from './cropImageWeb';

describe('cropImageWeb layout', () => {
  it('maps selection within letterboxed contain area', () => {
    const layout = computeContainedLayout(400, 300, 800, 2000);
    expect(layout.offsetX).toBeGreaterThan(0);

    const crop = mapSelectionToCrop(
      { x: layout.offsetX + 10, y: layout.offsetY + 10, width: 100, height: 200 },
      layout,
      800,
      2000
    );
    expect(crop).not.toBeNull();
    expect(crop!.originX).toBeGreaterThanOrEqual(0);
    expect(crop!.width).toBeGreaterThan(0);
  });

  it('returns null when selection is only in letterbox margin', () => {
    const layout = computeContainedLayout(400, 300, 800, 2000);
    const crop = mapSelectionToCrop({ x: 0, y: 0, width: 50, height: 50 }, layout, 800, 2000);
    expect(crop).toBeNull();
  });
});
