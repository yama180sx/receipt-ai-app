import { describe, expect, it } from 'vitest';
import { API_SCHEMA_EXPORTS } from './apiSchemas';
import {
  collectOpenApiSchemaNames,
  defaultOpenApiFilePath,
} from '../utils/openapiSchemaCollector';

describe('apiSchemas', () => {
  it('exports only schema names that exist in openapi.yaml', () => {
    const openApiNames = new Set(collectOpenApiSchemaNames(defaultOpenApiFilePath()));
    const missing = API_SCHEMA_EXPORTS.filter((name) => !openApiNames.has(name));

    expect(
      missing,
      `apiSchemas.ts references schemas missing from OpenAPI:\n${missing.join('\n')}`
    ).toEqual([]);
  });
});
