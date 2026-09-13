import fs from 'fs';

const FILE_BACKED_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'TOTP_ENCRYPTION_KEY',
  'GEMINI_API_KEY',
  'AI_BUDGET_DISCORD_WEBHOOK_URL',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
] as const;

function readSecretFile(environmentVariable: string, filePath: string): string {
  let value: string;
  try {
    value = fs.readFileSync(filePath, 'utf8').replace(/\r?\n$/, '');
  } catch {
    throw new Error(`Secret file for ${environmentVariable} could not be read`);
  }

  if (!value) {
    throw new Error(`Secret file for ${environmentVariable} is empty`);
  }

  return value;
}

/**
 * Docker secret / systemd credential のファイル参照を、依存モジュールの import 前に解決する。
 * 値・ファイル内容・ファイルパスをログへ出力してはならない。
 */
export function loadSecretFiles(): void {
  for (const environmentVariable of FILE_BACKED_ENVIRONMENT_VARIABLES) {
    const filePath = process.env[`${environmentVariable}_FILE`];
    if (!filePath) continue;

    process.env[environmentVariable] = readSecretFile(environmentVariable, filePath);
  }
}
