import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calcItemLineTotal } from './itemLineTotal';

type ItemLineTotalVector = {
  id: string;
  price: unknown;
  quantity?: unknown;
  expected: number;
};

type ItemLineTotalFixture = {
  vectors: ItemLineTotalVector[];
};

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/testing/fixtures/itemLineTotal-vectors.json'
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as ItemLineTotalFixture;

describe('calcItemLineTotal contract (itemLineTotal-vectors.json)', () => {
  it.each(fixture.vectors)('$id', ({ price, quantity, expected }) => {
    if (quantity === undefined) {
      expect(calcItemLineTotal(price)).toBe(expected);
      return;
    }
    expect(calcItemLineTotal(price, quantity)).toBe(expected);
  });
});
