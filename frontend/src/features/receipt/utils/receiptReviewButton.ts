export type CandidateLookupState = { key: string; status: 'ready' | 'error'; count: number };

export function isValidReceiptDate(value: string): boolean {
  const match = value.trim().match(/^(\d{4})[-\/.](\d{2})[-\/.](\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return false;
  const [, y, m, d, hour = '00', minute = '00'] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hour), Number(minute));
  return date.getFullYear() === Number(y) && date.getMonth() === Number(m) - 1 && date.getDate() === Number(d) && date.getHours() === Number(hour) && date.getMinutes() === Number(minute);
}

export function resolveReviewButton(key: string, lookup: CandidateLookupState) {
  if (!key) return { pending: false, failed: false, label: '登録' };
  if (lookup.key !== key) return { pending: true, failed: false, label: '確認中' };
  if (lookup.status === 'error') return { pending: false, failed: true, label: '再確認' };
  return { pending: false, failed: false, label: lookup.count > 0 ? '登録済みと比べる' : '登録' };
}
