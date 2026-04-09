import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔌  Checking database connection…");
  await prisma.$queryRaw`SELECT 1`;
  console.log("✅  Connected successfully.");
  const ministryCount = await prisma.ministry.count();
  const bookCount = await prisma.book.count();
  const stepCount = await prisma.workflowStep.count();
  console.log(`\n📊  Seed summary:`);
  console.log(`    Ministries : ${ministryCount}`);
  console.log(`    Books      : ${bookCount}`);
  console.log(`    Workflow   : ${stepCount} steps`);
}

main()
  .catch((e) => { console.error("❌  Connection failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
