import fs from 'fs';
import path from 'path';

/** docs/openapi/openapi.yaml の components/schemas 名一覧を抽出する */
export function collectOpenApiSchemaNames(openApiFilePath: string): string[] {
  const absolutePath = path.resolve(openApiFilePath);
  const doc = fs.readFileSync(absolutePath, 'utf8');

  const schemasStart = doc.indexOf('\n  schemas:\n');
  if (schemasStart < 0) {
    throw new Error('OpenAPI document is missing components/schemas section');
  }

  const names: string[] = [];
  const section = doc.slice(schemasStart);
  for (const line of section.split('\n')) {
    const match = line.match(/^    ([A-Za-z0-9]+):\s*$/);
    if (match) {
      names.push(match[1]);
    }
  }

  return names;
}

export function defaultOpenApiFilePath(): string {
  return path.resolve(__dirname, '../../../docs/openapi/openapi.yaml');
}
