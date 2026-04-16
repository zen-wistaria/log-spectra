import prisma from "./client";
import { user } from "./seeder/user";

async function main() {
  try {
    await user();
  } catch {
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
