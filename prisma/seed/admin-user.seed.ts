import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { RoleName } from '@medical-inventory/shared-types';

export async function seedAdminUser(prisma: PrismaClient) {
  console.log('🌱 Seeding owner / super admin user...');

  const ownerRole = await prisma.role.findUnique({
    where: { name: RoleName.OWNER },
  });

  if (!ownerRole) {
    throw new Error('Owner role must be seeded before creating admin user.');
  }

  const defaultBranch = await prisma.branch.findFirst({
    where: { isDefault: true },
  });

  const passwordHash = await argon2.hash('Admin@123456');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@medcare.com' },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: 'admin@medcare.com',
      mobile: '9876543210',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });

  // Assign Owner Role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: ownerRole.id,
    },
  });

  // Assign Default Branch
  if (defaultBranch) {
    await prisma.branchMembership.upsert({
      where: {
        userId_branchId: {
          userId: adminUser.id,
          branchId: defaultBranch.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        branchId: defaultBranch.id,
      },
    });
  }

  console.log('✅ Seeded admin user: admin@medcare.com / Admin@123456');
}
