export type ScanReturnTo = 'home' | 'tray';

export function scanPath(jobId: string, returnTo: ScanReturnTo = 'home'): string {
  return `/scan/${encodeURIComponent(jobId)}?returnTo=${returnTo}`;
}

export function parseScanReturnTo(value: string | string[] | undefined): ScanReturnTo {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'tray' ? 'tray' : 'home';
}

export function returnPathForScan(returnTo: ScanReturnTo): string {
  return returnTo === 'tray' ? '/tray' : '/';
}
