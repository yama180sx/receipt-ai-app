import { describe, expect, it } from 'vitest';
import { parseProductClassificationReviewStatuses } from './productClassificationReviewService';

describe('parseProductClassificationReviewStatuses', () => {
  it('defaults to all review statuses', () => {
    expect(parseProductClassificationReviewStatuses()).toEqual([
      'NEEDS_REVIEW',
      'UNCLASSIFIED',
      'OUTSIDE_INITIAL_SCOPE',
    ]);
  });

  it('accepts comma-separated review statuses and excludes unsupported values', () => {
    expect(parseProductClassificationReviewStatuses(['needs_review,unclassified', 'classified'])).toEqual([
      'NEEDS_REVIEW',
      'UNCLASSIFIED',
    ]);
  });

  it('does not make not_applicable selectable in the review list', () => {
    expect(parseProductClassificationReviewStatuses(['not_applicable'])).toEqual([
      'NEEDS_REVIEW',
      'UNCLASSIFIED',
      'OUTSIDE_INITIAL_SCOPE',
    ]);
  });
});
