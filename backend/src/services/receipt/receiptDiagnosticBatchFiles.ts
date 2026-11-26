import fs from 'node:fs';
import path from 'node:path';

/** 意図しない多数画像・リンク先へのアクセスを避ける。エラーにファイル名を含めない。 */
export function listBatchImages(directory: string, expectedCount: number): string[] {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || expectedCount > 20) throw new Error('Invalid batch count.');
  const directoryInfo = fs.lstatSync(directory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink() || (directoryInfo.mode & 0o077) !== 0 || (process.getuid && directoryInfo.uid !== process.getuid())) throw new Error('Invalid batch directory.');
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => /\.jpe?g$/i.test(entry.name))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  if (entries.length !== expectedCount) throw new Error('Batch image count does not match.');
  return entries.map((entry) => {
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error('Invalid batch image.');
    const fullPath = path.join(directory, entry.name);
    const stat = fs.lstatSync(fullPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 10 * 1024 * 1024) throw new Error('Invalid batch image.');
    return fullPath;
  });
}

/** mkdtemp で新規に作った非公開ディレクトリ内に限って新規作成する。 */
export function writePrivateBatchJson(directory: string, name: string, value: unknown): void {
  if (!/^(batch|result-\d{3})\.json$/.test(name)) throw new Error('Invalid report name.');
  fs.writeFileSync(path.join(directory, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}
