import { PrismaClient } from '@prisma/client';

// 引数は一切渡さない。
// Node.jsのプロセスが持っている DATABASE_URL を Prisma 内部に自動で探させる。
const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 Seeding Start ---');

  const familyMembers = [
    { id: 1, name: 'あなた（管理者）' },
    { id: 2, name: '妻' },
    { id: 3, name: '息子（高校生）' },
  ];

  for (const m of familyMembers) {
    await prisma.familyMember.upsert({
      where: { id: m.id },
      update: { name: m.name },
      create: m,
    });
  }

  const categories = [
    { id: 1, name: '食費' },
    { id: 2, name: '日用品' },
    { id: 3, name: '教育費' },
    { id: 4, name: '光熱費' },
    { id: 5, name: 'その他' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: c,
    });
  }

  console.log('✅ Seeding Completed.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });