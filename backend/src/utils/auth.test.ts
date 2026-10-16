import { describe, expect, it } from 'vitest';
import { generateAccessToken, generatePendingToken, verifyToken } from './auth';

const member = {
  id: 41,
  name: 'テスト利用者',
  familyGroupId: 9,
  role: 'USER',
  authVersion: 3,
};

describe('auth token payload', () => {
  it('access tokenに認証versionを含める', () => {
    const payload = verifyToken(generateAccessToken(member));

    expect(payload).toMatchObject({
      memberId: member.id,
      authVersion: member.authVersion,
      purpose: 'access',
    });
  });

  it('pending tokenに認証versionを含める', () => {
    const payload = verifyToken(
      generatePendingToken(member, 'totp_pending'),
      ['totp_pending']
    );

    expect(payload).toMatchObject({
      memberId: member.id,
      authVersion: member.authVersion,
      purpose: 'totp_pending',
    });
  });
});
