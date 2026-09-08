import { parseGlobalAiBudgetManagerBootstrapArgs, globalAiBudgetManagerBootstrapConfirmation } from '../src/services/aiBudget/globalAiBudgetManagerBootstrapInput';
import { bootstrapAiBudgetManager } from '../src/services/aiBudget/globalAiBudgetAdminService';
import { prisma } from '../src/utils/prismaClient';

const usage = `Usage: npm run ai-budget:bootstrap-manager -- --member-id MEMBER_ID --operator OPERATOR --reason REASON --confirm ${globalAiBudgetManagerBootstrapConfirmation}`;

async function main() {
  const input = parseGlobalAiBudgetManagerBootstrapArgs(process.argv.slice(2));
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
