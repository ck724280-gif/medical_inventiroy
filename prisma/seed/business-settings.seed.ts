import { PrismaClient } from '@prisma/client';

export async function seedBusinessSettings(prisma: PrismaClient) {
  console.log('🌱 Seeding business settings, branding, and default branch...');

  // 1. Business Profile Settings
  await prisma.businessSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'MedCare Pharmacy & Healthcare',
      address: 'Shop No. 4 & 5, Commercial Complex, Main Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pinZip: '560001',
      phone: '+91 98765 43210',
      altPhone: '+91 80 2345 6789',
      email: 'contact@medcarepharmacy.com',
      website: 'https://medcarepharmacy.com',
      gstNumber: '29ABCDE1234F1Z5',
      pharmacyLicense: 'KA-BGL-123456 / KA-BGL-123457',
      description: 'Your trusted healthcare and medicine dispensary partner.',
      currencyCode: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD-MM-YYYY',
      timeFormat: '12h',
      defaultLanguage: 'en',
      businessHours: JSON.stringify({
        monday: { open: '08:00', close: '22:00', isOpen: true },
        tuesday: { open: '08:00', close: '22:00', isOpen: true },
        wednesday: { open: '08:00', close: '22:00', isOpen: true },
        thursday: { open: '08:00', close: '22:00', isOpen: true },
        friday: { open: '08:00', close: '22:00', isOpen: true },
        saturday: { open: '08:00', close: '22:00', isOpen: true },
        sunday: { open: '09:00', close: '21:00', isOpen: true },
      }),
    },
  });

  // 2. Business Branding
  await prisma.businessBranding.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      primaryColor: '#0284c7', // Sky-600 medical blue
      secondaryColor: '#0f172a', // Slate-900
      loginBranding: JSON.stringify({
        title: 'MedCare ERP & POS',
        subtitle: 'Enterprise Medical Inventory Management System',
      }),
    },
  });

  // 3. Default Branch
  let defaultBranch = await prisma.branch.findFirst({
    where: { isDefault: true },
  });

  if (!defaultBranch) {
    defaultBranch = await prisma.branch.create({
      data: {
        name: 'Main Dispensary Branch',
        code: 'MAIN-01',
        address: 'Shop No. 4 & 5, Commercial Complex, Main Road',
        city: 'Bangalore',
        state: 'Karnataka',
        phone: '+91 98765 43210',
        email: 'main@medcarepharmacy.com',
        isDefault: true,
        isActive: true,
      },
    });
  }

  // 4. Branch Settings
  await prisma.branchSettings.upsert({
    where: { branchId: defaultBranch.id },
    update: {},
    create: {
      branchId: defaultBranch.id,
      invoicePrefix: 'MED',
      invoiceNextNumber: 1,
      thermalPaperWidth: '58mm',
    },
  });

  // 5. Default Receipt Template
  const existingReceiptTemplate = await prisma.receiptTemplate.findFirst({
    where: { isDefault: true },
  });

  if (!existingReceiptTemplate) {
    await prisma.receiptTemplate.create({
      data: {
        name: 'Standard 58mm Medical Thermal Receipt',
        paperWidth: '58mm',
        showLogo: true,
        showGst: true,
        showLicense: true,
        headerText: 'MedCare Pharmacy & Healthcare',
        footerText: 'Emergency Helpline: +91 98765 43210',
        thankYouMessage: 'Thank You! Get Well Soon',
        returnPolicy: 'Goods once sold can only be returned within 7 days with original invoice.',
        isDefault: true,
      },
    });
  }

  console.log('✅ Seeded business profile, branding, branch, and receipt template.');
}
