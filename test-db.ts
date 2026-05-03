import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const users = await prisma.user.findMany({
      select: { email: true, username: true, role: true }
    });
    console.log("SUCCESS! Database is connected.");
    console.log("Users found in database:", users);
  } catch (e) {
    console.error("FAILED TO CONNECT:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
