import { parseGlobalAiBudgetManagerBootstrapArgs, globalAiBudgetManagerBootstrapConfirmation } from '../src/services/aiBudget/globalAiBudgetManagerBootstrapInput';
import { loadSecretFiles } from '../src/config/secretFiles';

const usage = `Usage: npm run ai-budget:bootstrap-manager -- --member-id MEMBER_ID --operator OPERATOR --reason REASON --confirm ${globalAiBudgetManagerBootstrapConfirmation}`;

async function main() {
  const input = parseGlobalAiBudgetManagerBootstrapArgs(process.argv.slice(2));
  // root管理runtimeでは秘密値を *_FILE で受け取る。Prismaを読む前に解決しないと、
  // CLIだけがDATABASE_URL未設定で失敗するため、依存を動的に読み込む。
  loadSecretFiles();
  const [{ bootstrapAiBudgetManager }, { prisma }] = await Promise.all([
    import('../src/services/aiBudget/globalAiBudgetManagerBootstrapService.js'),
    import('../src/utils/prismaClient.js'),
  ]);
  try {
    const result = await bootstrapAiBudgetManager(input);
    console.log(JSON.stringify({ memberId: result.member.id, memberName: result.member.name, familyGroupId: result.member.familyGroupId, action: 'initial_manager_bootstrapped' }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : usage);
  console.error(usage);
  process.exitCode = 1;
});
