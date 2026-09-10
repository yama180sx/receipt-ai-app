import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadSecretFiles } from './secretFiles';

const variableName = 'JWT_SECRET';
const fileVariableName = `${variableName}_FILE`;
const originalValue = process.env[variableName];
const originalFileValue = process.env[fileVariableName];
const temporaryDirectories: string[] = [];

afterEach(() => {
  if (originalValue === undefined) delete process.env[variableName];
  else process.env[variableName] = originalValue;

  if (originalFileValue === undefined) delete process.env[fileVariableName];
  else process.env[fileVariableName] = originalFileValue;

  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('loadSecretFiles', () => {
  it('loads a newline-terminated secret file without exposing its value', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-secret-file-test-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'jwt');
    const syntheticValue = 'synthetic-jwt-value';
    fs.writeFileSync(filePath, `${syntheticValue}\n`, { mode: 0o600 });
    process.env[fileVariableName] = filePath;
    delete process.env[variableName];

    loadSecretFiles();

    expect(process.env[variableName]).toBe(syntheticValue);
  });

  it('does not include a secret value when its file cannot be read', () => {
    const syntheticValue = 'synthetic-jwt-value';
    process.env[variableName] = syntheticValue;
    process.env[fileVariableName] = path.join(os.tmpdir(), 'missing-secret-file');

    expect(() => loadSecretFiles()).toThrow('Secret file for JWT_SECRET could not be read');
    try {
      loadSecretFiles();
    } catch (error) {
      expect(error).not.toHaveProperty('message', expect.stringContaining(syntheticValue));
    }
  });
});
