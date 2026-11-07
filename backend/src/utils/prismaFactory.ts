import { PrismaClient, type Prisma } from '#prisma';
import { PrismaPg } from '@prisma/adapter-pg';

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is unavailable');
  return value;
}

/**
 * Prisma 7 direct-PostgreSQL接続の唯一の生成経路。
 * server.ts/CLIは呼出前にsecret fileを解決するため、値・pathはここで扱わない。
 */
export function createPrismaClient(log?: Prisma.LogLevel[]): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl(), connectionTimeoutMillis: 5000 }),
    ...(log ? { log } : {}),
  });
}
