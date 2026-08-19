import { PrismaClient } from '@prisma/client';
import { STANDARD_UNITS } from '../../packages/constants/src/gst.js';
import { DosageForm, BatchStatus, StockMovementType, MovementDirection } from '@medical-inventory/shared-types';

export async function seedSampleData(prisma: PrismaClient) {
  console.log('🌱 Seeding standard units, categories, manufacturers, suppliers, customers, medicines, and initial batches...');

  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@medcare.com' } });
  const defaultBranch = await prisma.branch.findFirst({ where: { isDefault: true } });

  if (!adminUser || !defaultBranch) {
    throw new Error('Admin user and default branch must exist before seeding sample data.');
  }

  // 1. Units
  const unitMap = new Map<string, string>();
  for (const u of STANDARD_UNITS) {
    const created = await prisma.unit.upsert({
      where: { name: u.name },
      update: { abbreviation: u.abbreviation },
      create: { name: u.name, abbreviation: u.abbreviation },
    });
    unitMap.set(u.name, created.id);
  }

  const tabUnitId = unitMap.get('Tablet')!;
  const stripUnitId = unitMap.get('Strip')!;
  const boxUnitId = unitMap.get('Box')!;
  const btlUnitId = unitMap.get('Bottle')!;

  async function getOrCreateCategory(name: string, description: string) {
    let cat = await prisma.medicineCategory.findFirst({ where: { name, parentId: null } });
    if (!cat) {
      cat = await prisma.medicineCategory.create({ data: { name, description } });
    }
    return cat;
  }

  // 2. Categories
  const analgesics = await getOrCreateCategory('Analgesics & Antipyretics', 'Pain relief and fever reduction');
  const antibiotics = await getOrCreateCategory('Antibiotics & Antimicrobials', 'Bacterial infection treatments');
  const antiallergy = await getOrCreateCategory('Antiallergic & Respiratory', 'Allergy, cold and cough relief');
  const vitamins = await getOrCreateCategory('Vitamins & Nutritional Supplements', 'Daily wellness and recovery vitamins');

  // 3. Manufacturers
  const cipla = await prisma.manufacturer.upsert({
    where: { name: 'Cipla Ltd.' },
    update: {},
    create: {
      name: 'Cipla Ltd.',
      contactPerson: 'Karan Mehra',
      phone: '+91 22 2482 6000',
      email: 'corporate@cipla.com',
      address: 'Mumbai Central, Mumbai, Maharashtra',
    },
  });

  const sunPharma = await prisma.manufacturer.upsert({
    where: { name: 'Sun Pharma Industries Ltd.' },
    update: {},
    create: {
      name: 'Sun Pharma Industries Ltd.',
      contactPerson: 'Sanjay Deshmukh',
      phone: '+91 22 4324 4324',
      email: 'contact@sunpharma.com',
      address: 'Goregaon East, Mumbai, Maharashtra',
    },
  });

  const drReddys = await prisma.manufacturer.upsert({
    where: { name: "Dr. Reddy's Laboratories" },
    update: {},
    create: {
      name: "Dr. Reddy's Laboratories",
      contactPerson: 'Vikram Reddy',
      phone: '+91 40 4900 2900',
      email: 'info@drreddys.com',
      address: 'Banjara Hills, Hyderabad, Telangana',
    },
  });

  // 4. Suppliers
  const apexWholesale = await prisma.supplier.upsert({
    where: { id: 'supplier-apex' },
    update: {},
    create: {
      id: 'supplier-apex',
      name: 'Apex Pharma Distributors',
      company: 'Apex Healthcare Logistics Pvt. Ltd.',
      contactPerson: 'Ramesh Gupta',
      phone: '+91 98450 11223',
      email: 'orders@apexpharma.com',
      address: 'Peenya Industrial Area, Bangalore',
      gstNumber: '29AAACA1234A1Z1',
      paymentTerms: '30 Days Net',
      creditLimit: 200000,
      openingBalance: 0,
      currentBalance: 0,
    },
  });

  const globalDist = await prisma.supplier.upsert({
    where: { id: 'supplier-global' },
    update: {},
    create: {
      id: 'supplier-global',
      name: 'Global Medical Agency',
      company: 'Global Med Agency',
      contactPerson: 'Anil Saxena',
      phone: '+91 98860 33445',
      email: 'sales@globalmed.com',
      address: 'Chickpet, Bangalore',
      gstNumber: '29BBBCB5678B2Z2',
      paymentTerms: '15 Days Net',
      creditLimit: 150000,
      openingBalance: 0,
      currentBalance: 0,
    },
  });

  // 5. Customers
  await prisma.customer.upsert({
    where: { mobile: '9844012345' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      mobile: '9844012345',
      email: 'rahul.sharma@example.com',
      address: 'Indiranagar, Bangalore',
    },
  });

  await prisma.customer.upsert({
    where: { mobile: '9877098765' },
    update: {},
    create: {
      name: 'Priya Patel',
      mobile: '9877098765',
      email: 'priya.patel@example.com',
      address: 'Koramangala, Bangalore',
    },
  });

  // 6. Sample Medicines & Multi-Batch FEFO Setup

  // Medicine 1: Paracetamol 650mg (Dolo / Pacimol generic)
  const dolo = await prisma.medicine.upsert({
    where: { sku: 'MED-DOLO-650' },
    update: {},
    create: {
      name: 'Paracetamol 650mg Tablets',
      genericName: 'Paracetamol',
      brandName: 'Dolo 650',
      composition: 'Paracetamol IP 650mg',
      strength: '650mg',
      dosageForm: DosageForm.TABLET,
      categoryId: analgesics.id,
      manufacturerId: cipla.id,
      sku: 'MED-DOLO-650',
      barcode: '8901234567890',
      hsnCode: '30049060',
      taxPercent: 12,
      baseUnitId: tabUnitId,
      packSize: '15 Tablets / Strip',
      stripQty: 15,
      boxQty: 150,
      mrp: 32.50,
      defaultPurchasePrice: 20.00,
      defaultSellingPrice: 30.00,
      reorderLevel: 50,
      reorderQty: 200,
      maxStock: 2000,
      prescriptionRequired: false,
    },
  });

  // Unit conversion for Dolo: 1 Strip = 15 Tablets
  await prisma.medicineUnit.upsert({
    where: {
      medicineId_fromUnitId_toUnitId: {
        medicineId: dolo.id,
        fromUnitId: stripUnitId,
        toUnitId: tabUnitId,
      },
    },
    update: {},
    create: {
      medicineId: dolo.id,
      fromUnitId: stripUnitId,
      toUnitId: tabUnitId,
      conversionFactor: 15,
    },
  });

  // Batches for Dolo:
  // Batch 1: Expiring in 6 months (FEFO First)
  const doloBatch1 = await prisma.batch.upsert({
    where: {
      medicineId_branchId_batchNumber: {
        medicineId: dolo.id,
        branchId: defaultBranch.id,
        batchNumber: 'DL26A01',
      },
    },
    update: {},
    create: {
      medicineId: dolo.id,
      branchId: defaultBranch.id,
      batchNumber: 'DL26A01',
      mfgDate: new Date('2025-01-15'),
      expiryDate: new Date('2026-12-31'), // Earlier expiry -> FEFO priority
      supplierId: apexWholesale.id,
      purchasePrice: 20.00,
      mrp: 32.50,
      sellingPrice: 30.00,
      taxPercent: 12,
      initialQty: 300,
      currentQty: 250,
      status: BatchStatus.ACTIVE,
    },
  });

  // Batch 2: Expiring in 2 years
  const doloBatch2 = await prisma.batch.upsert({
    where: {
      medicineId_branchId_batchNumber: {
        medicineId: dolo.id,
        branchId: defaultBranch.id,
        batchNumber: 'DL26B09',
      },
    },
    update: {},
    create: {
      medicineId: dolo.id,
      branchId: defaultBranch.id,
      batchNumber: 'DL26B09',
      mfgDate: new Date('2025-08-10'),
      expiryDate: new Date('2028-06-30'), // Later expiry
      supplierId: apexWholesale.id,
      purchasePrice: 21.00,
      mrp: 32.50,
      sellingPrice: 30.00,
      taxPercent: 12,
      initialQty: 500,
      currentQty: 500,
      status: BatchStatus.ACTIVE,
    },
  });

  // Medicine 2: Cetirizine 10mg
  const cetirizine = await prisma.medicine.upsert({
    where: { sku: 'MED-CET-10' },
    update: {},
    create: {
      name: 'Cetirizine Hydrochloride 10mg',
      genericName: 'Cetirizine HCl',
      brandName: 'Cetzine',
      composition: 'Cetirizine Dihydrochloride 10mg',
      strength: '10mg',
      dosageForm: DosageForm.TABLET,
      categoryId: antiallergy.id,
      manufacturerId: sunPharma.id,
      sku: 'MED-CET-10',
      barcode: '8901234567891',
      hsnCode: '30049099',
      taxPercent: 12,
      baseUnitId: tabUnitId,
      packSize: '10 Tablets / Strip',
      stripQty: 10,
      mrp: 22.00,
      defaultPurchasePrice: 12.50,
      defaultSellingPrice: 20.00,
      reorderLevel: 30,
      reorderQty: 150,
      maxStock: 1000,
      prescriptionRequired: false,
    },
  });

  await prisma.batch.upsert({
    where: {
      medicineId_branchId_batchNumber: {
        medicineId: cetirizine.id,
        branchId: defaultBranch.id,
        batchNumber: 'CT25K04',
      },
    },
    update: {},
    create: {
      medicineId: cetirizine.id,
      branchId: defaultBranch.id,
      batchNumber: 'CT25K04',
      mfgDate: new Date('2025-03-01'),
      expiryDate: new Date('2027-08-31'),
      supplierId: globalDist.id,
      purchasePrice: 12.50,
      mrp: 22.00,
      sellingPrice: 20.00,
      taxPercent: 12,
      initialQty: 200,
      currentQty: 180,
      status: BatchStatus.ACTIVE,
    },
  });

  // Medicine 3: Amoxicillin & Potassium Clavulanate (Augmentin generic - Rx required)
  const augmentin = await prisma.medicine.upsert({
    where: { sku: 'MED-AUG-625' },
    update: {},
    create: {
      name: 'Amoxicillin and Potassium Clavulanate 625mg',
      genericName: 'Amoxicillin + Clavulanic Acid',
      brandName: 'Augmentin 625 DUO',
      composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
      strength: '625mg',
      dosageForm: DosageForm.TABLET,
      categoryId: antibiotics.id,
      manufacturerId: drReddys.id,
      sku: 'MED-AUG-625',
      barcode: '8901234567892',
      hsnCode: '30041000',
      taxPercent: 12,
      baseUnitId: tabUnitId,
      packSize: '10 Tablets / Strip',
      stripQty: 10,
      mrp: 215.00,
      defaultPurchasePrice: 140.00,
      defaultSellingPrice: 200.00,
      reorderLevel: 20,
      reorderQty: 80,
      maxStock: 500,
      prescriptionRequired: true, // Prescription required flag
    },
  });

  await prisma.batch.upsert({
    where: {
      medicineId_branchId_batchNumber: {
        medicineId: augmentin.id,
        branchId: defaultBranch.id,
        batchNumber: 'AG25X99',
      },
    },
    update: {},
    create: {
      medicineId: augmentin.id,
      branchId: defaultBranch.id,
      batchNumber: 'AG25X99',
      mfgDate: new Date('2025-05-15'),
      expiryDate: new Date('2027-04-30'),
      supplierId: apexWholesale.id,
      purchasePrice: 140.00,
      mrp: 215.00,
      sellingPrice: 200.00,
      taxPercent: 12,
      initialQty: 100,
      currentQty: 95,
      status: BatchStatus.ACTIVE,
    },
  });

  // Medicine 4: Cough Syrup 100ml
  const coughSyrup = await prisma.medicine.upsert({
    where: { sku: 'MED-SYR-COUGH' },
    update: {},
    create: {
      name: 'Ascoril D Plus Cough Syrup 100ml',
      genericName: 'Dextromethorphan + Chlorpheniramine + Phenylephrine',
      brandName: 'Ascoril D Plus',
      composition: 'Each 5ml contains Dextromethorphan 10mg, CPM 2mg, Phenylephrine 5mg',
      strength: '100ml',
      dosageForm: DosageForm.SYRUP,
      categoryId: antiallergy.id,
      manufacturerId: cipla.id,
      sku: 'MED-SYR-COUGH',
      barcode: '8901234567893',
      hsnCode: '30049099',
      taxPercent: 12,
      baseUnitId: btlUnitId,
      packSize: '100ml Bottle',
      mrp: 115.00,
      defaultPurchasePrice: 75.00,
      defaultSellingPrice: 105.00,
      reorderLevel: 15,
      reorderQty: 60,
      maxStock: 300,
      prescriptionRequired: false,
    },
  });

  await prisma.batch.upsert({
    where: {
      medicineId_branchId_batchNumber: {
        medicineId: coughSyrup.id,
        branchId: defaultBranch.id,
        batchNumber: 'AS25C12',
      },
    },
    update: {},
    create: {
      medicineId: coughSyrup.id,
      branchId: defaultBranch.id,
      batchNumber: 'AS25C12',
      mfgDate: new Date('2025-02-01'),
      expiryDate: new Date('2027-01-31'),
      supplierId: globalDist.id,
      purchasePrice: 75.00,
      mrp: 115.00,
      sellingPrice: 105.00,
      taxPercent: 12,
      initialQty: 50,
      currentQty: 48,
      status: BatchStatus.ACTIVE,
    },
  });

  // Medicine 5: Vitamin C + Zinc Chewable (Limcee generic)
  const vitaminC = await prisma.medicine.upsert({
    where: { sku: 'MED-VIT-C' },
    update: {},
    create: {
      name: 'Vitamin C 500mg + Zinc Chewable Tablets',
      genericName: 'Ascorbic Acid + Zinc',
      brandName: 'Limcee Chewable',
      composition: 'Ascorbic Acid 500mg + Elemental Zinc 5mg',
      strength: '500mg',
      dosageForm: DosageForm.TABLET,
      categoryId: vitamins.id,
      manufacturerId: sunPharma.id,
      sku: 'MED-VIT-C',
      barcode: '8901234567894',
      hsnCode: '29362700',
      taxPercent: 18,
      baseUnitId: tabUnitId,
      packSize: '15 Tablets / Strip',
      stripQty: 15,
      mrp: 35.00,
      defaultPurchasePrice: 18.00,
      defaultSellingPrice: 32.00,
      reorderLevel: 25,
      reorderQty: 100,
      maxStock: 1000,
      prescriptionRequired: false,
    },
  });

  await prisma.batch.upsert({
    where: {
      medicineId_branchId_batchNumber: {
        medicineId: vitaminC.id,
        branchId: defaultBranch.id,
        batchNumber: 'LC25Z08',
      },
    },
    update: {},
    create: {
      medicineId: vitaminC.id,
      branchId: defaultBranch.id,
      batchNumber: 'LC25Z08',
      mfgDate: new Date('2025-06-01'),
      expiryDate: new Date('2027-05-31'),
      supplierId: apexWholesale.id,
      purchasePrice: 18.00,
      mrp: 35.00,
      sellingPrice: 32.00,
      taxPercent: 18,
      initialQty: 150,
      currentQty: 145,
      status: BatchStatus.ACTIVE,
    },
  });

  // Record Opening Stock Movements for audit history
  console.log('✅ Seeded sample medicines, categories, manufacturers, and active inventory batches.');
}
