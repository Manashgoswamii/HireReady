import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Delete all submissions first
  await prisma.submissions.deleteMany();

  // Now delete all questions
  await prisma.question.deleteMany();

  console.log('Deleted all submissions and questions');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
