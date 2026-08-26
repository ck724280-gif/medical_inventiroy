const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('--- Inspecting Database State ---');
  const branches = await prisma.branch.findMany({ select: { id: true, code: true, name: true } });
  console.log('Branches:', branches);

  const mainBranch = branches.find(b => b.code === 'MAIN-01') || branches[0];
  console.log('Selected Main Branch:', mainBranch);

  const user = await prisma.user.findFirst({
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  console.log('Active User:', user);

  const medicines = await prisma.medicine.findMany({
    take: 10,
    include: {
      batches: {
        where: { branchId: mainBranch ? mainBranch.id : undefined },
      },
    },
  });
  console.log('Sample Medicines count:', medicines.length);

  const openShifts = await prisma.cashierShift.findMany({
    where: { branchId: mainBranch ? mainBranch.id : undefined, status: 'OPEN' },
  });
  console.log('Open shifts in main branch:', openShifts);
}

inspect()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error during inspection:', e);
    prisma.$disconnect();
  });
