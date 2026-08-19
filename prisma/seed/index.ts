import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './permissions.seed.js';
import { seedRoles } from './roles.seed.js';
import { seedBusinessSettings } from './business-settings.seed.js';
import { seedAdminUser } from './admin-user.seed.js';
import { seedSampleData } from './sample-data.seed.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Medical Inventory ERP/POS Database Seed...');

  try {
    // Step 1: Seed Permissions
    await seedPermissions(prisma);

    // Step 2: Seed Roles & Map Permissions
    await seedRoles(prisma);

    // Step 3: Seed Business Settings, Branding & Default Branch
    await seedBusinessSettings(prisma);

    // Step 4: Seed Default Admin User
    await seedAdminUser(prisma);

    // Step 5: Seed Standard Units, Categories, Manufacturers & Sample Medicines/Batches
    await seedSampleData(prisma);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
