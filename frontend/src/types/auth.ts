/**
 * 認証ドメイン型
 *
 * - DTO: OpenAPI generated の re-export
 * - ViewModel: ログイン結果・永続セッション（OpenAPI 非該当）
 */

/** OpenAPI DTO（auth API） */
export type {
  ResolvedFamily,
  AuthFamilyMember,
  LoginMember,
  LoginResponse,
  TotpSetupInfo,
} from '../api/generated';
import type { LoginMember } from '../api/generated';

/** ログイン成功後のクライアント保持データ（ViewModel） */
export type LoginResult = {
  token: string;
  member: LoginMember;
};

/** AsyncStorage 等に保存するセッション（ViewModel） */
export type StoredSession = {
  token: string;
  memberId: number;
  memberName: string;
  familyGroupId: number;
  familyGroupName: string;
  role: string | null;
};
