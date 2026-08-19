import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLES } from '../../packages/constants/src/roles.js';

export async function seedRoles(prisma: PrismaClient) {
  console.log('🌱 Seeding roles and role permissions...');

  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isActive: true,
      },
    });

    // Clear existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Find permissions to assign
    const permissions = await prisma.permission.findMany({
      where: {
        code: { in: roleDef.permissions },
      },
    });

    // Assign permissions
    for (const perm of permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log(`✅ Seeded ${DEFAULT_ROLES.length} default roles with mapped permissions.`);
}
