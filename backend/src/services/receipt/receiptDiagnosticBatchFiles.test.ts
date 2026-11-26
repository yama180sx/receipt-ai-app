import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listBatchImages, writePrivateBatchJson } from './receiptDiagnosticBatchFiles';

const directories: string[] = [];
function temporaryDirectory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recaipt-batch-test-'));
  directories.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of directories.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('private diagnostic batch files', () => {
  it('checks the exact image count and rejects symlinks', () => {
    const dir = temporaryDirectory();
    fs.writeFileSync(path.join(dir, 'a.jpg'), 'test');
    expect(listBatchImages(dir, 1)).toHaveLength(1);
    expect(() => listBatchImages(dir, 2)).toThrow();
    fs.symlinkSync(path.join(dir, 'a.jpg'), path.join(dir, 'link.jpg'));
    expect(() => listBatchImages(dir, 2)).toThrow();
  });
  it('rejects an input directory accessible by other users', () => {
    const dir = temporaryDirectory();
    fs.writeFileSync(path.join(dir, 'a.jpg'), 'test');
    fs.chmodSync(dir, 0o755);
    expect(() => listBatchImages(dir, 1)).toThrow();
  });
  it('creates a restricted report without overwriting an existing file', () => {
    const dir = temporaryDirectory();
    writePrivateBatchJson(dir, 'result-001.json', { value: 'private' });
    const file = path.join(dir, 'result-001.json');
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(() => writePrivateBatchJson(dir, 'result-001.json', {})).toThrow();
    expect(() => writePrivateBatchJson(dir, '../outside.json', {})).toThrow();
  });
});
