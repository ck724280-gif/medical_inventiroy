import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_zprDj3gNco1W@ep-bitter-recipe-aywnmxlu.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function main() {
  console.log('Connecting to Neon PostgreSQL database...');
  try {
    const userCount = await prisma.user.count();
    const medicineCount = await prisma.medicine.count();
    const batchCount = await prisma.batch.count();
    const roleCount = await prisma.role.count();
    const branchCount = await prisma.branch.count();
    console.log('--- Neon Database Connectivity Report ---');
    console.log('Status: CONNECTED SUCCESSFULLY');
    console.log(`Users: ${userCount}`);
    console.log(`Roles: ${roleCount}`);
    console.log(`Branches: ${branchCount}`);
    console.log(`Medicines: ${medicineCount}`);
    console.log(`Batches: ${batchCount}`);
  } catch (error) {
    console.error('Error connecting to Neon database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
