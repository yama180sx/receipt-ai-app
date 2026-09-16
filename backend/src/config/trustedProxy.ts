/**
 * 信頼するリバースプロキシの段数。
 * 既定の 0 は X-Forwarded-For を信頼しない安全側の設定である。
 */
export function getTrustedProxyHops(rawValue = process.env.TRUST_PROXY_HOPS): number {
  if (rawValue === undefined || rawValue === '') return 0;
  if (!/^[0-2]$/.test(rawValue)) {
    throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 2');
  }
  return Number(rawValue);
}
