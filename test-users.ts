import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

main().finally(() => prisma.$disconnect());
