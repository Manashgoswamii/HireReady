import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient();


(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL database via Prisma");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
  }
})();


export default prisma;