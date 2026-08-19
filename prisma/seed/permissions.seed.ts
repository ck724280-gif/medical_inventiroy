import { PrismaClient } from '@prisma/client';
import { PERMISSIONS } from '../../packages/constants/src/permissions.js';

export async function seedPermissions(prisma: PrismaClient) {
  console.log('🌱 Seeding permissions...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        description: perm.description,
      },
      create: {
        code: perm.code,
        module: perm.module,
        description: perm.description,
      },
    });
  }

  console.log(`✅ Seeded ${PERMISSIONS.length} permissions.`);
}
