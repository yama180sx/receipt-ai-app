import fs from 'node:fs';
import { createPrismaClient } from '../src/utils/prismaFactory';

const source = process.env.DATABASE_URL_FILE;
if (!source) process.exit(20);
const value = fs.readFileSync(source, 'utf8').trim();
const url = new URL(value);
if (url.username !== 'cntadm' || url.hostname !== 'db' || url.pathname !== '/receipt_db') process.exit(21);

const prisma = createPrismaClient();
try {
  await prisma.$queryRawUnsafe('SELECT 1');
  process.stdout.write(decodeURIComponent(url.password));
} catch {
  process.exitCode = 22;
} finally {
  await prisma.$disconnect();
}
