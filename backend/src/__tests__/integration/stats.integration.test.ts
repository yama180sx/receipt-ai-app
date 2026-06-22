import '../../test/mockReceiptQueue';

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import {
  ensureTestMemberPassword,
  loginAsTestMember,
  shouldRunDbIntegration,
} from './helpers/integrationHelpers';

const app = createApp();

describe.skipIf(!shouldRunDbIntegration())('Stats API integration', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
  });

  it('POST /api/stats/settlement/transfers with invalid body returns error envelope', async () => {
    const token = await loginAsTestMember(app);
    const res = await request(app)
      .post('/api/stats/settlement/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe('string');
  });
});
