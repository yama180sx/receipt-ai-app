import { describe, expect, it } from 'vitest';
import { requireTenantContext, runWithTenant } from './context';

describe('requireTenantContext', () => {
  it('returns familyGroupId and memberId from ALS store', () => {
    runWithTenant({ familyGroupId: 10, memberId: 20 }, () => {
      expect(requireTenantContext()).toEqual({ familyGroupId: 10, memberId: 20 });
    });
  });
});
