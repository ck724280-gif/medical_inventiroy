import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding 30+ Demo Subjects across all ERP modules...');

  // 1. Fetch Admin User and Branches
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@medcare.com' },
  });
  if (!adminUser) {
    throw new Error('Admin user not found. Please ensure admin user is initialized.');
  }

  let mainBranch = await prisma.branch.findFirst({ where: { code: 'MAIN-01' } });
  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        code: 'MAIN-01',
        name: 'MedCare Central Pharmacy (HQ)',
        address: 'Shop 1-4, Ground Floor, Central Medical Plaza, M.G. Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: '+91 98765 43210',
        email: 'central@medcare.com',
        gstNumber: '27AABCU9603R1ZM',
        drugLicenseNo: 'DL-20B-MH-102938, DL-21B-MH-102939',
        isDefault: true,
        isActive: true,
      },
    });
  }

  let branch2 = await prisma.branch.findFirst({ where: { code: 'BR-02' } });
  if (!branch2) {
    branch2 = await prisma.branch.create({
      data: {
        code: 'BR-02',
        name: 'MedCare City Care Branch',
        address: 'Block B, Metro Station Complex, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400069',
        phone: '+91 98765 43211',
        email: 'andheri@medcare.com',
        gstNumber: '27AABCU9603R1ZN',
        drugLicenseNo: 'DL-20B-MH-203948, DL-21B-MH-203949',
        isDefault: false,
        isActive: true,
      },
    });
  }

  // Ensure Admin is linked to both branches
  await prisma.branchMembership.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: mainBranch.id } },
    update: {},
    create: { userId: adminUser.id, branchId: mainBranch.id },
  });
  await prisma.branchMembership.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: branch2.id } },
    update: {},
    create: { userId: adminUser.id, branchId: branch2.id },
  });

  // 2. Units
  const unitsData = [
    { name: 'Tablet', abbreviation: 'TAB' },
    { name: 'Strip', abbreviation: 'STP' },
    { name: 'Box', abbreviation: 'BOX' },
    { name: 'Bottle', abbreviation: 'BTL' },
    { name: 'Vial', abbreviation: 'VIA' },
    { name: 'Ampoule', abbreviation: 'AMP' },
    { name: 'Tube', abbreviation: 'TUB' },
    { name: 'Inhaler', abbreviation: 'INH' },
    { name: 'Sachet', abbreviation: 'SAC' },
  ];
  const unitMap: Record<string, string> = {};
  for (const u of unitsData) {
    const res = await prisma.unit.upsert({
      where: { name: u.name },
      update: { abbreviation: u.abbreviation },
      create: { name: u.name, abbreviation: u.abbreviation },
    });
    unitMap[u.name] = res.id;
  }

  // 3. Categories
  const categoriesList = [
    { name: 'Analgesics & Pain Relief', desc: 'Painkillers, fever & inflammation reduction' },
    { name: 'Antibiotics & Antimicrobials', desc: 'Broad spectrum & targeted antibiotic treatments' },
    { name: 'Antacids & Gastrointestinal', desc: 'GERD, acidity, proton-pump inhibitors, digestion' },
    { name: 'Cardiovascular & Hypertension', desc: 'Blood pressure, cardiac wellness, cholesterol' },
    { name: 'Antidiabetics & Endocrine', desc: 'Insulin, Metformin & blood sugar regulators' },
    { name: 'Respiratory & Cough Formulations', desc: 'Cough syrups, bronchodilators, inhalers' },
    { name: 'Vitamins & Minerals', desc: 'Multivitamins, calcium, iron, daily supplements' },
    { name: 'Dermatological & Antifungal', desc: 'Ointments, creams, antifungal powders & gels' },
    { name: 'Ophthalmics & ENT Drops', desc: 'Eye drops, ear drops, nasal sprays' },
    { name: 'Emergency & Critical Injectables', desc: 'IV fluids, emergency infusions, anesthetics' },
  ];
  const categoryMap: Record<string, string> = {};
  for (const c of categoriesList) {
    let cat = await prisma.medicineCategory.findFirst({ where: { name: c.name } });
    if (!cat) {
      cat = await prisma.medicineCategory.create({ data: { name: c.name, description: c.desc } });
    }
    categoryMap[c.name] = cat.id;
  }

  // 4. Manufacturers
  const manufacturersList = [
    { name: 'Cipla Ltd.', contact: 'Karan Mehra', phone: '022-24826000', email: 'orders@cipla.com' },
    { name: 'Sun Pharma Ltd.', contact: 'Sanjay Deshmukh', phone: '022-43244324', email: 'supply@sunpharma.com' },
    { name: "Dr. Reddy's Laboratories", contact: 'Vikram Reddy', phone: '040-49002900', email: 'sales@drreddys.com' },
    { name: 'Lupin Pharmaceuticals Ltd.', contact: 'Anil Gupta', phone: '022-66402222', email: 'info@lupin.com' },
    { name: 'Mankind Pharma Ltd.', contact: 'Ramesh Juneja', phone: '011-46846700', email: 'contact@mankindpharma.com' },
    { name: 'Torrent Pharmaceuticals', contact: 'Samir Patel', phone: '079-26599000', email: 'info@torrentpharma.com' },
    { name: 'Abbott Healthcare Pvt Ltd.', contact: 'Pooja Nair', phone: '022-38162000', email: 'india@abbott.com' },
    { name: 'Alkem Laboratories', contact: 'Rajesh Kumar', phone: '022-39829999', email: 'sales@alkem.com' },
    { name: 'Zydus Healthcare', contact: 'Pankaj Patel', phone: '079-71800000', email: 'care@zyduscadila.com' },
    { name: 'Glenmark Pharmaceuticals', contact: 'Glenn Saldanha', phone: '022-40189999', email: 'corp@glenmarkpharma.com' },
  ];
  const mfgMap: Record<string, string> = {};
  for (const m of manufacturersList) {
    const mfg = await prisma.manufacturer.upsert({
      where: { name: m.name },
      update: { contactPerson: m.contact, phone: m.phone, email: m.email },
      create: { name: m.name, contactPerson: m.contact, phone: m.phone, email: m.email, address: 'India' },
    });
    mfgMap[m.name] = mfg.id;
  }

  // 5. 35+ Suppliers
  const suppliersSeed = [
    { name: 'Apex Pharma Distributors', comp: 'Apex Healthcare Logistics', phone: '9845011001', gst: '27AABCA1234A1Z1', city: 'Mumbai', bal: 15000 },
    { name: 'Sunlight Medical Agencies', comp: 'Sunlight Pharma LLP', phone: '9845011002', gst: '27AABCS2345B1Z2', city: 'Pune', bal: 28400 },
    { name: 'Shree Balaji Pharmaceuticals', comp: 'Balaji Distributors', phone: '9845011003', gst: '27AABCB3456C1Z3', city: 'Nagpur', bal: 4200 },
    { name: 'Metro LifeSciences Hub', comp: 'Metro Lifesciences Ltd', phone: '9845011004', gst: '27AABCM4567D1Z4', city: 'Thane', bal: 0 },
    { name: 'MediCare Wholesale Corp', comp: 'MediCare Wholesale Corp', phone: '9845011005', gst: '27AABCW5678E1Z5', city: 'Navi Mumbai', bal: 32000 },
    { name: 'Vibrant Biotech Suppliers', comp: 'Vibrant Biotech Pvt Ltd', phone: '9845011006', gst: '27AABCV6789F1Z6', city: 'Nashik', bal: 8500 },
    { name: 'National Pharma Syndicate', comp: 'National Syndicate Ltd', phone: '9845011007', gst: '27AABCN7890G1Z7', city: 'Kolhapur', bal: 19400 },
    { name: 'Zenith Drug Distributors', comp: 'Zenith Healthcare Agency', phone: '9845011008', gst: '27AABCZ8901H1Z8', city: 'Aurangabad', bal: 0 },
    { name: 'Royal Medico Agencies', comp: 'Royal Medico Agency', phone: '9845011009', gst: '27AABCR9012I1Z9', city: 'Solapur', bal: 12000 },
    { name: 'Kalyan Pharma Depot', comp: 'Kalyan Logistics Ltd', phone: '9845011010', gst: '27AABCK0123J1Z0', city: 'Kalyan', bal: 5400 },
    { name: 'Sai Ram Drug House', comp: 'Sai Ram Healthcare', phone: '9845011011', gst: '27AABCS1234K1Z1', city: 'Mumbai', bal: 22000 },
    { name: 'Universal Pharma Distributors', comp: 'Universal Pharma Depot', phone: '9845011012', gst: '27AABCU2345L1Z2', city: 'Pune', bal: 18000 },
    { name: 'Apollo Supply Network', comp: 'Apollo Health Supply', phone: '9845011013', gst: '27AABCA3456M1Z3', city: 'Thane', bal: 45000 },
    { name: 'Global Cure Agency', comp: 'Global Cure Agency', phone: '9845011014', gst: '27AABCG4567N1Z4', city: 'Mumbai', bal: 0 },
    { name: 'Hind Healthcare Distr.', comp: 'Hind Medical Depot', phone: '9845011015', gst: '27AABCH5678O1Z5', city: 'Nagpur', bal: 7800 },
    { name: 'Premier Pharma Agency', comp: 'Premier Pharma Care', phone: '9845011016', gst: '27AABCP6789P1Z6', city: 'Pune', bal: 14500 },
    { name: 'LifeLine Drug Wholesale', comp: 'LifeLine Distributors', phone: '9845011017', gst: '27AABCL7890Q1Z7', city: 'Nashik', bal: 0 },
    { name: 'Swastik Medical Supply', comp: 'Swastik Agencies', phone: '9845011018', gst: '27AABCS8901R1Z8', city: 'Mumbai', bal: 31000 },
    { name: 'Omkar Biotech Logistics', comp: 'Omkar Biotech', phone: '9845011019', gst: '27AABCO9012S1Z9', city: 'Aurangabad', bal: 9200 },
    { name: 'Prabhat Pharma Traders', comp: 'Prabhat Traders', phone: '9845011020', gst: '27AABCP0123T1Z0', city: 'Kolhapur', bal: 16800 },
    { name: 'Siddhi Vinayak Medics', comp: 'Siddhi Vinayak LLP', phone: '9845011021', gst: '27AABCS1234U1Z1', city: 'Mumbai', bal: 0 },
    { name: 'Delta Pharma Depot', comp: 'Delta Healthcare Logistics', phone: '9845011022', gst: '27AABCD2345V1Z2', city: 'Pune', bal: 41000 },
    { name: 'Alpha Medico Corporation', comp: 'Alpha Medico Corp', phone: '9845011023', gst: '27AABCA3456W1Z3', city: 'Nagpur', bal: 11200 },
    { name: 'Star Healthcare Supplies', comp: 'Star Health Depot', phone: '9845011024', gst: '27AABCS4567X1Z4', city: 'Thane', bal: 8900 },
    { name: 'Pioneer Pharma Dist.', comp: 'Pioneer Healthcare', phone: '9845011025', gst: '27AABCP5678Y1Z5', city: 'Mumbai', bal: 0 },
    { name: 'Navkar Pharma Agency', comp: 'Navkar Agencies Ltd', phone: '9845011026', gst: '27AABCN6789Z1Z6', city: 'Solapur', bal: 26000 },
    { name: 'Arihant Medical Store Dist.', comp: 'Arihant Distributors', phone: '9845011027', gst: '27AABCA7890A1Z7', city: 'Pune', bal: 13400 },
    { name: 'Mahavir Drug Agencies', comp: 'Mahavir Drug LLP', phone: '9845011028', gst: '27AABCM8901B1Z8', city: 'Mumbai', bal: 37500 },
    { name: 'CarePoint Med Logistics', comp: 'CarePoint Logistics', phone: '9845011029', gst: '27AABCC9012C1Z9', city: 'Nashik', bal: 0 },
    { name: 'Unity Pharma Wholesale', comp: 'Unity Healthcare Syndicate', phone: '9845011030', gst: '27AABCU0123D1Z0', city: 'Thane', bal: 19800 },
    { name: 'Reliable Medical Corp', comp: 'Reliable Drug Agency', phone: '9845011031', gst: '27AABCR1234E1Z1', city: 'Mumbai', bal: 29000 },
    { name: 'Express Pharma Logistics', comp: 'Express Pharma Ltd', phone: '9845011032', gst: '27AABCE2345F1Z2', city: 'Pune', bal: 0 },
    { name: 'Shubham Drug House', comp: 'Shubham Healthcare', phone: '9845011033', gst: '27AABCS3456G1Z3', city: 'Nagpur', bal: 14200 },
    { name: 'Zenith Bio Supply', comp: 'Zenith Bio Network', phone: '9845011034', gst: '27AABCZ4567H1Z4', city: 'Aurangabad', bal: 6100 },
    { name: 'Everest Medical Agencies', comp: 'Everest Health Distributors', phone: '9845011035', gst: '27AABCE5678I1Z5', city: 'Mumbai', bal: 48000 },
  ];

  const createdSuppliers: any[] = [];
  for (const s of suppliersSeed) {
    let sup = await prisma.supplier.findFirst({ where: { phone: s.phone } });
    if (!sup) {
      sup = await prisma.supplier.create({
        data: {
          name: s.name,
          company: s.comp,
          contactPerson: s.name.split(' ')[0] + ' ' + s.name.split(' ')[1],
          phone: s.phone,
          email: `${s.phone}@suppliers.com`,
          address: `${s.city}, Maharashtra`,
          gstNumber: s.gst,
          paymentTerms: '30 Days Net',
          creditLimit: 100000,
          currentBalance: s.bal,
          isActive: true,
        },
      });
    }
    createdSuppliers.push(sup);
  }

  // 6. 35+ Customers
  const customersSeed = [
    { name: 'Rajesh Sharma', phone: '9820011001', email: 'rajesh.sharma@gmail.com', city: 'Mumbai', credit: 5000, bal: 1200 },
    { name: 'Sunita Patel', phone: '9820011002', email: 'sunita.patel@gmail.com', city: 'Thane', credit: 2000, bal: 0 },
    { name: 'Amitabh Verma', phone: '9820011003', email: 'amitabh.v@yahoo.com', city: 'Mumbai', credit: 10000, bal: 3450 },
    { name: 'Pooja Kulkarni', phone: '9820011004', email: 'pooja.k@outlook.com', city: 'Pune', credit: 5000, bal: 0 },
    { name: 'Dr. Suresh Deshmukh', phone: '9820011005', email: 'dr.suresh@deshmukhclinic.com', city: 'Mumbai', credit: 50000, bal: 18400 },
    { name: 'Vikram Malhotra', phone: '9820011006', email: 'vikram.m@gmail.com', city: 'Navi Mumbai', credit: 3000, bal: 650 },
    { name: 'Anjali Nair', phone: '9820011007', email: 'anjali.nair@gmail.com', city: 'Mumbai', credit: 2000, bal: 0 },
    { name: 'Manoj Tiwari', phone: '9820011008', email: 'manoj.tiwari@rediffmail.com', city: 'Kalyan', credit: 4000, bal: 820 },
    { name: 'Kavita Joshi', phone: '9820011009', email: 'kavita.joshi@gmail.com', city: 'Pune', credit: 5000, bal: 0 },
    { name: 'Dr. Neha Saxena', phone: '9820011010', email: 'neha.saxena@saxenahospital.org', city: 'Mumbai', credit: 40000, bal: 12500 },
    { name: 'Gaurav Singhania', phone: '9820011011', email: 'gaurav.s@gmail.com', city: 'Thane', credit: 5000, bal: 0 },
    { name: 'Meena Iyer', phone: '9820011012', email: 'meena.iyer@gmail.com', city: 'Mumbai', credit: 3000, bal: 450 },
    { name: 'Sanjay Rawat', phone: '9820011013', email: 'sanjay.rawat@gmail.com', city: 'Pune', credit: 2000, bal: 0 },
    { name: 'Rekha Choudhary', phone: '9820011014', email: 'rekha.c@gmail.com', city: 'Nashik', credit: 5000, bal: 1100 },
    { name: 'Deepak Merchant', phone: '9820011015', email: 'deepak.m@merchantcorp.com', city: 'Mumbai', credit: 15000, bal: 4200 },
    { name: 'Shweta Banerjee', phone: '9820011016', email: 'shweta.b@gmail.com', city: 'Mumbai', credit: 2000, bal: 0 },
    { name: 'Rohit Agrawal', phone: '9820011017', email: 'rohit.a@agrawaltraders.in', city: 'Nagpur', credit: 8000, bal: 2100 },
    { name: 'Priya Sundaram', phone: '9820011018', email: 'priya.s@gmail.com', city: 'Mumbai', credit: 4000, bal: 0 },
    { name: 'Alok Nath Mishra', phone: '9820011019', email: 'alok.mishra@gmail.com', city: 'Thane', credit: 3000, bal: 980 },
    { name: 'Divya Khurana', phone: '9820011020', email: 'divya.k@gmail.com', city: 'Pune', credit: 5000, bal: 0 },
    { name: 'Naveen Jindal', phone: '9820011021', email: 'naveen.j@jindalgroup.in', city: 'Mumbai', credit: 25000, bal: 7600 },
    { name: 'Sarita Gokhale', phone: '9820011022', email: 'sarita.g@gmail.com', city: 'Kolhapur', credit: 2000, bal: 0 },
    { name: 'Kishore Biyani', phone: '9820011023', email: 'kishore.b@gmail.com', city: 'Mumbai', credit: 12000, bal: 3100 },
    { name: 'Rashmi Sen', phone: '9820011024', email: 'rashmi.sen@gmail.com', city: 'Pune', credit: 3000, bal: 0 },
    { name: 'Harish Mehta', phone: '9820011025', email: 'harish.mehta@gmail.com', city: 'Solapur', credit: 4000, bal: 1400 },
    { name: 'Bhavna Parekh', phone: '9820011026', email: 'bhavna.p@gmail.com', city: 'Mumbai', credit: 2000, bal: 0 },
    { name: 'Vinod Kambli', phone: '9820011027', email: 'vinod.k@gmail.com', city: 'Thane', credit: 5000, bal: 1850 },
    { name: 'Geeta Ranganathan', phone: '9820011028', email: 'geeta.r@gmail.com', city: 'Mumbai', credit: 3000, bal: 0 },
    { name: 'Mahesh Bhatt', phone: '9820011029', email: 'mahesh.b@gmail.com', city: 'Pune', credit: 6000, bal: 2400 },
    { name: 'Sneha Kadam', phone: '9820011030', email: 'sneha.kadam@gmail.com', city: 'Aurangabad', credit: 2000, bal: 0 },
    { name: 'Ashok Leyland Staff Welfare', phone: '9820011031', email: 'welfare@ashok.com', city: 'Mumbai', credit: 35000, bal: 9200 },
    { name: 'Chetan Bhagat', phone: '9820011032', email: 'chetan.b@gmail.com', city: 'Mumbai', credit: 5000, bal: 0 },
    { name: 'Pallavi Shinde', phone: '9820011033', email: 'pallavi.s@gmail.com', city: 'Pune', credit: 2000, bal: 300 },
    { name: 'Tanmay Bhat', phone: '9820011034', email: 'tanmay.bhat@gmail.com', city: 'Mumbai', credit: 8000, bal: 0 },
    { name: 'Nandini Das', phone: '9820011035', email: 'nandini.das@gmail.com', city: 'Nagpur', credit: 4000, bal: 1200 },
  ];

  const createdCustomers: any[] = [];
  for (const c of customersSeed) {
    let cust = await prisma.customer.findFirst({ where: { mobile: c.phone } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          name: c.name,
          mobile: c.phone,
          email: c.email,
          address: `${c.city}, Maharashtra`,
          creditLimit: c.credit,
          currentBalance: c.bal,
          isActive: true,
        },
      });
    }
    createdCustomers.push(cust);
  }

  // 7. 35+ Real Medicines
  const medicinesSeed = [
    { name: 'Dolo 650 Tablet', gen: 'Paracetamol IP 650mg', sku: 'MED-DOLO-650', form: 'TABLET', cat: 'Analgesics & Pain Relief', mfg: 'Micro Labs', mrp: 34.0, pur: 22.5, sel: 30.0, gst: 12, sch: 'OTC', unit: 'Tablet', spb: 15, tps: 15 },
    { name: 'Augmentin 625 Duo', gen: 'Amoxicillin 500mg + Clavulanic Acid 125mg', sku: 'MED-AUG-625', form: 'TABLET', cat: 'Antibiotics & Antimicrobials', mfg: 'GlaxoSmithKline', mrp: 224.0, pur: 165.0, sel: 205.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Pan-D Capsule', gen: 'Pantoprazole 40mg + Domperidone 30mg SR', sku: 'MED-PAND-01', form: 'CAPSULE', cat: 'Antacids & Gastrointestinal', mfg: 'Alkem Laboratories', mrp: 199.0, pur: 135.0, sel: 180.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Strip', spb: 10, tps: 15 },
    { name: 'Telma 40 Tablet', gen: 'Telmisartan IP 40mg', sku: 'MED-TELMA-40', form: 'TABLET', cat: 'Cardiovascular & Hypertension', mfg: 'Glenmark Pharmaceuticals', mrp: 145.0, pur: 98.0, sel: 130.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 20, tps: 15 },
    { name: 'Glycomet GP 1 Tablet', gen: 'Metformin 500mg + Glimepiride 1mg', sku: 'MED-GLY-GP1', form: 'TABLET', cat: 'Antidiabetics & Endocrine', mfg: 'USV Ltd', mrp: 110.0, pur: 74.0, sel: 99.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 15 },
    { name: 'Montek-LC Tablet', gen: 'Montelukast 10mg + Levocetirizine 5mg', sku: 'MED-MONT-LC', form: 'TABLET', cat: 'Respiratory & Cough Formulations', mfg: 'Sun Pharma Ltd.', mrp: 175.0, pur: 118.0, sel: 158.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Azithral 500 Tablet', gen: 'Azithromycin IP 500mg', sku: 'MED-AZI-500', form: 'TABLET', cat: 'Antibiotics & Antimicrobials', mfg: 'Alembic Pharmaceuticals', mrp: 132.0, pur: 89.0, sel: 119.0, gst: 12, sch: 'SCHEDULE_H1', unit: 'Tablet', spb: 5, tps: 5 },
    { name: 'Shelcal 500 Tablet', gen: 'Calcium 500mg + Vitamin D3 250 IU', sku: 'MED-SHEL-500', form: 'TABLET', cat: 'Vitamins & Minerals', mfg: 'Torrent Pharmaceuticals', mrp: 130.0, pur: 88.0, sel: 118.0, gst: 12, sch: 'OTC', unit: 'Tablet', spb: 15, tps: 15 },
    { name: 'Becosules Capsule', gen: 'Vitamin B-Complex with Vitamin C', sku: 'MED-BECO-01', form: 'CAPSULE', cat: 'Vitamins & Minerals', mfg: 'Pfizer Ltd', mrp: 55.0, pur: 36.0, sel: 49.0, gst: 12, sch: 'OTC', unit: 'Strip', spb: 20, tps: 20 },
    { name: 'Ascoril LS Syrup (100ml)', gen: 'Levosalbutamol + Ambroxol + Guaiphenesin', sku: 'MED-ASC-LS', form: 'SYRUP', cat: 'Respiratory & Cough Formulations', mfg: 'Glenmark Pharmaceuticals', mrp: 125.0, pur: 84.0, sel: 112.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Betadine 10% Solution (100ml)', gen: 'Povidone Iodine IP 10% w/v', sku: 'MED-BETA-100', form: 'LIQUID', cat: 'Dermatological & Antifungal', mfg: 'Win-Medicare', mrp: 148.0, pur: 102.0, sel: 135.0, gst: 12, sch: 'OTC', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Volini Pain Relief Gel (50g)', gen: 'Diclofenac Diethylamine 1.16% + Linseed Oil', sku: 'MED-VOL-50G', form: 'GEL', cat: 'Analgesics & Pain Relief', mfg: 'Sun Pharma Ltd.', mrp: 160.0, pur: 110.0, sel: 145.0, gst: 12, sch: 'OTC', unit: 'Tube', spb: 1, tps: 1 },
    { name: 'Electral Powder (21.8g Sachet)', gen: 'Oral Rehydration Salts WHO Formula', sku: 'MED-ELEC-SAC', form: 'POWDER', cat: 'Antacids & Gastrointestinal', mfg: 'FDC Ltd', mrp: 23.5, pur: 15.0, sel: 21.0, gst: 5, sch: 'OTC', unit: 'Sachet', spb: 50, tps: 1 },
    { name: 'Liv 52 Syrup (200ml)', gen: 'Ayurvedic Herbal Liver Formulation', sku: 'MED-LIV52-200', form: 'SYRUP', cat: 'Antacids & Gastrointestinal', mfg: 'Himalaya Wellness', mrp: 180.0, pur: 125.0, sel: 165.0, gst: 12, sch: 'OTC', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Thyronorm 50mcg Tablet', gen: 'Thyroxine Sodium IP 50 mcg', sku: 'MED-THY-50', form: 'TABLET', cat: 'Antidiabetics & Endocrine', mfg: 'Abbott Healthcare Pvt Ltd.', mrp: 165.0, pur: 115.0, sel: 150.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Bottle', spb: 1, tps: 120 },
    { name: 'Neurobion Forte Tablet', gen: 'Vitamin B1 + B2 + B3 + B5 + B6 + B12', sku: 'MED-NEURO-FORTE', form: 'TABLET', cat: 'Vitamins & Minerals', mfg: 'Procter & Gamble Health', mrp: 42.0, pur: 28.0, sel: 38.0, gst: 12, sch: 'OTC', unit: 'Strip', spb: 30, tps: 30 },
    { name: 'Allegra 120mg Tablet', gen: 'Fexofenadine Hydrochloride 120mg', sku: 'MED-ALL-120', form: 'TABLET', cat: 'Respiratory & Cough Formulations', mfg: 'Sanofi India Ltd', mrp: 218.0, pur: 152.0, sel: 198.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Taxim-O 200 Tablet', gen: 'Cefixime Trihydrate IP 200mg', sku: 'MED-TAX-200', form: 'TABLET', cat: 'Antibiotics & Antimicrobials', mfg: 'Alkem Laboratories', mrp: 115.0, pur: 78.0, sel: 105.0, gst: 12, sch: 'SCHEDULE_H1', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Mox 500 Capsule', gen: 'Amoxicillin Trihydrate IP 500mg', sku: 'MED-MOX-500', form: 'CAPSULE', cat: 'Antibiotics & Antimicrobials', mfg: 'Sun Pharma Ltd.', mrp: 108.0, pur: 72.0, sel: 98.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Capsule', spb: 15, tps: 15 },
    { name: 'Combiflam Tablet', gen: 'Ibuprofen 400mg + Paracetamol 325mg', sku: 'MED-COM-FLAM', form: 'TABLET', cat: 'Analgesics & Pain Relief', mfg: 'Sanofi India Ltd', mrp: 45.0, pur: 30.0, sel: 41.0, gst: 12, sch: 'OTC', unit: 'Tablet', spb: 20, tps: 20 },
    { name: 'Meftal-Spas Tablet', gen: 'Mefenamic Acid 250mg + Dicyclomine 10mg', sku: 'MED-MEF-SPAS', form: 'TABLET', cat: 'Analgesics & Pain Relief', mfg: 'Blue Cross Laboratories', mrp: 52.0, pur: 35.0, sel: 47.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Otrivin Oxy Fast Relief Nasal Spray', gen: 'Oxymetazoline Hydrochloride 0.05%', sku: 'MED-OTR-NASAL', form: 'DROPS', cat: 'Ophthalmics & ENT Drops', mfg: 'GSK Consumer Healthcare', mrp: 110.0, pur: 75.0, sel: 99.0, gst: 12, sch: 'OTC', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Digene Gel Mint (200ml)', gen: 'Magnesium Hydroxide + Simethicone + Aluminium', sku: 'MED-DIG-200', form: 'SUSPENSION', cat: 'Antacids & Gastrointestinal', mfg: 'Abbott Healthcare Pvt Ltd.', mrp: 155.0, pur: 108.0, sel: 140.0, gst: 12, sch: 'OTC', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Cheston Cold Tablet', gen: 'Cetirizine 5mg + Paracetamol 325mg + Phenylephrine', sku: 'MED-CHES-COLD', form: 'TABLET', cat: 'Respiratory & Cough Formulations', mfg: 'Cipla Ltd.', mrp: 58.0, pur: 39.0, sel: 52.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Grilinctus Syrup (100ml)', gen: 'Dextromethorphan + Chlorpheniramine + Guaiphenesin', sku: 'MED-GRI-100', form: 'SYRUP', cat: 'Respiratory & Cough Formulations', mfg: 'Franco-Indian Pharma', mrp: 128.0, pur: 86.0, sel: 115.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Ciplox 500 Tablet', gen: 'Ciprofloxacin Hydrochloride IP 500mg', sku: 'MED-CIP-500', form: 'TABLET', cat: 'Antibiotics & Antimicrobials', mfg: 'Cipla Ltd.', mrp: 48.0, pur: 32.0, sel: 44.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 10, tps: 10 },
    { name: 'Amlong 5 Tablet', gen: 'Amlodipine Besylate IP 5mg', sku: 'MED-AML-5', form: 'TABLET', cat: 'Cardiovascular & Hypertension', mfg: 'Micro Labs', mrp: 72.0, pur: 48.0, sel: 65.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 15, tps: 15 },
    { name: 'Atorva 20 Tablet', gen: 'Atorvastatin Calcium IP 20mg', sku: 'MED-ATO-20', form: 'TABLET', cat: 'Cardiovascular & Hypertension', mfg: 'Zydus Healthcare', mrp: 195.0, pur: 132.0, sel: 175.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 15, tps: 15 },
    { name: 'Pantocid 40 Tablet', gen: 'Pantoprazole Sodium IP 40mg', sku: 'MED-PAN-40', form: 'TABLET', cat: 'Antacids & Gastrointestinal', mfg: 'Sun Pharma Ltd.', mrp: 160.0, pur: 108.0, sel: 145.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 15, tps: 15 },
    { name: 'Duolin Inhaler (200 MDI)', gen: 'Levosalbutamol 50mcg + Ipratropium 20mcg', sku: 'MED-DUO-INH', form: 'INHALER', cat: 'Respiratory & Cough Formulations', mfg: 'Cipla Ltd.', mrp: 410.0, pur: 295.0, sel: 375.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Inhaler', spb: 1, tps: 1 },
    { name: 'Ciplox Eye/Ear Drops (10ml)', gen: 'Ciprofloxacin Ophthalmic 0.3% w/v', sku: 'MED-CIP-DROP', form: 'DROPS', cat: 'Ophthalmics & ENT Drops', mfg: 'Cipla Ltd.', mrp: 21.5, pur: 14.0, sel: 19.5, gst: 12, sch: 'SCHEDULE_H', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Candid Dusting Powder (100g)', gen: 'Clotrimazole Dusting Powder IP 1% w/w', sku: 'MED-CAN-100G', form: 'POWDER', cat: 'Dermatological & Antifungal', mfg: 'Glenmark Pharmaceuticals', mrp: 155.0, pur: 105.0, sel: 140.0, gst: 12, sch: 'OTC', unit: 'Bottle', spb: 1, tps: 1 },
    { name: 'Calpol 500 Tablet', gen: 'Paracetamol IP 500mg', sku: 'MED-CAL-500', form: 'TABLET', cat: 'Analgesics & Pain Relief', mfg: 'GlaxoSmithKline', mrp: 18.5, pur: 12.0, sel: 16.5, gst: 12, sch: 'OTC', unit: 'Tablet', spb: 15, tps: 15 },
    { name: 'Rantac 150 Tablet', gen: 'Ranitidine Hydrochloride IP 150mg', sku: 'MED-RAN-150', form: 'TABLET', cat: 'Antacids & Gastrointestinal', mfg: 'J.B. Chemicals', mrp: 42.0, pur: 28.0, sel: 38.0, gst: 12, sch: 'SCHEDULE_H', unit: 'Tablet', spb: 30, tps: 30 },
    { name: 'Fortwin Injection (1ml Ampoule)', gen: 'Pentazocine Lactate 30mg/ml', sku: 'MED-FORT-AMP', form: 'AMPOULE', cat: 'Emergency & Critical Injectables', mfg: 'Ranbaxy/Sun Pharma', mrp: 28.0, pur: 18.0, sel: 25.0, gst: 12, sch: 'SCHEDULE_X', unit: 'Ampoule', spb: 10, tps: 1 },
  ];

  const createdMedicines: any[] = [];
  for (const m of medicinesSeed) {
    const isCtrl = m.sch !== 'OTC';
    const baseUnitId = unitMap[m.unit] || unitMap['Tablet'];
    const categoryId = categoryMap[m.cat] || Object.values(categoryMap)[0];
    const manufacturerId = mfgMap[m.mfg] || Object.values(mfgMap)[0];

    const med = await prisma.medicine.upsert({
      where: { sku: m.sku },
      update: {
        name: m.name,
        genericName: m.gen,
        dosageForm: m.form,
        mrp: m.mrp,
        defaultPurchasePrice: m.pur,
        defaultSellingPrice: m.sel,
        taxPercent: m.gst,
        drugSchedule: m.sch,
        isScheduleH: m.sch === 'SCHEDULE_H',
        isScheduleH1: m.sch === 'SCHEDULE_H1',
        isScheduleX: m.sch === 'SCHEDULE_X',
        prescriptionRequired: isCtrl,
      },
      create: {
        name: m.name,
        genericName: m.gen,
        brandName: m.name.split(' ')[0],
        dosageForm: m.form,
        categoryId,
        manufacturerId,
        sku: m.sku,
        barcode: `8901234${Math.floor(100000 + Math.random() * 900000)}`,
        baseUnitId,
        taxPercent: m.gst,
        mrp: m.mrp,
        defaultPurchasePrice: m.pur,
        defaultSellingPrice: m.sel,
        stripsPerBox: m.spb,
        tabletsPerStrip: m.tps,
        drugSchedule: m.sch,
        isScheduleH: m.sch === 'SCHEDULE_H',
        isScheduleH1: m.sch === 'SCHEDULE_H1',
        isScheduleX: m.sch === 'SCHEDULE_X',
        prescriptionRequired: isCtrl,
        isActive: true,
      },
    });
    createdMedicines.push(med);
  }

  // 8. 35+ Inventory Batches (Fresh, Near Expiry & Expired for FEFO testing)
  const today = new Date();
  const createdBatches: any[] = [];

  for (let i = 0; i < createdMedicines.length; i++) {
    const med = createdMedicines[i];
    const sup = createdSuppliers[i % createdSuppliers.length];

    // Batch expiry variance:
    // Items 0-20: Fresh stock (expires in 18 to 36 months)
    // Items 21-28: Near Expiry for alerts (expires in 25 to 75 days)
    // Items 29-34: Expired stock (expired 2 to 6 months ago)
    let expiryDate: Date;
    let status = 'ACTIVE';
    if (i < 20) {
      expiryDate = new Date(today.getFullYear() + 2, today.getMonth() + (i % 6), 15);
    } else if (i < 28) {
      expiryDate = new Date(today.getTime() + (30 + i * 5) * 24 * 60 * 60 * 1000);
      status = 'ACTIVE';
    } else {
      expiryDate = new Date(today.getTime() - (60 + (i - 28) * 30) * 24 * 60 * 60 * 1000);
      status = 'EXPIRED';
    }

    const mfgDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const batchNumber = `BAT-2026-${String(i + 1).padStart(3, '0')}`;
    const initialQty = 250 + (i * 20);
    const currentQty = status === 'EXPIRED' ? 30 : initialQty - (i * 5);

    const batch = await prisma.batch.upsert({
      where: {
        medicineId_branchId_batchNumber: {
          medicineId: med.id,
          branchId: mainBranch.id,
          batchNumber,
        },
      },
      update: {
        expiryDate,
        currentQty,
        status,
      },
      create: {
        medicineId: med.id,
        branchId: mainBranch.id,
        batchNumber,
        mfgDate,
        expiryDate,
        supplierId: sup.id,
        purchasePrice: med.defaultPurchasePrice,
        mrp: med.mrp,
        sellingPrice: med.defaultSellingPrice,
        taxPercent: med.taxPercent,
        initialQty,
        currentQty,
        status,
      },
    });
    createdBatches.push(batch);

    // Also add batch to Branch 2 for multi-branch transfer testing
    if (i % 2 === 0) {
      await prisma.batch.upsert({
        where: {
          medicineId_branchId_batchNumber: {
            medicineId: med.id,
            branchId: branch2.id,
            batchNumber: `${batchNumber}-BR2`,
          },
        },
        update: {},
        create: {
          medicineId: med.id,
          branchId: branch2.id,
          batchNumber: `${batchNumber}-BR2`,
          mfgDate,
          expiryDate,
          supplierId: sup.id,
          purchasePrice: med.defaultPurchasePrice,
          mrp: med.mrp,
          sellingPrice: med.defaultSellingPrice,
          taxPercent: med.taxPercent,
          initialQty: 100,
          currentQty: 85,
          status: 'ACTIVE',
        },
      });
    }
  }

  // 9. 35+ Purchase Orders & Purchases
  for (let i = 0; i < 35; i++) {
    const sup = createdSuppliers[i % createdSuppliers.length];
    const med = createdMedicines[i % createdMedicines.length];
    const poNum = `PO-2026-${String(i + 1).padStart(4, '0')}`;
    const qty = 50 + (i * 5);
    const subtotal = med.defaultPurchasePrice * qty;
    const taxAmount = (subtotal * med.taxPercent) / 100;
    const totalAmount = subtotal + taxAmount;

    const po = await prisma.purchaseOrder.upsert({
      where: { poNumber: poNum },
      update: {},
      create: {
        poNumber: poNum,
        supplierId: sup.id,
        branchId: mainBranch.id,
        status: i % 3 === 0 ? 'FULLY_RECEIVED' : i % 2 === 0 ? 'SENT' : 'DRAFT',
        subtotal,
        taxAmount,
        totalAmount,
        createdByUserId: adminUser.id,
        items: {
          create: [
            {
              medicineId: med.id,
              orderedQty: qty,
              receivedQty: i % 3 === 0 ? qty : 0,
              expectedRate: med.defaultPurchasePrice,
              taxPercent: med.taxPercent,
              lineTotal: totalAmount,
            },
          ],
        },
      },
    });

    // Create Inward Purchase Invoice
    const purNum = `PUR-2026-${String(i + 1).padStart(4, '0')}`;
    const batch = createdBatches[i % createdBatches.length];

    await prisma.purchaseInvoice.upsert({
      where: { invoiceNumber: purNum },
      update: {},
      create: {
        invoiceNumber: purNum,
        supplierId: sup.id,
        branchId: mainBranch.id,
        status: 'CONFIRMED',
        subtotal,
        taxAmount,
        totalAmount,
        createdByUserId: adminUser.id,
        confirmedAt: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
        purchaseOrderId: po.id,
        items: {
          create: [
            {
              medicineId: med.id,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              mfgDate: batch.mfgDate,
              expiryDate: batch.expiryDate,
              qty,
              purchasePrice: med.defaultPurchasePrice,
              mrp: med.mrp,
              sellingPrice: med.defaultSellingPrice,
              taxPercent: med.taxPercent,
              lineTotal: totalAmount,
            },
          ],
        },
        payments: {
          create: [
            {
              supplierId: sup.id,
              amount: totalAmount,
              paymentMode: i % 2 === 0 ? 'BANK_TRANSFER' : 'UPI',
              referenceNumber: `TXN-PUR-${i + 1000}`,
              createdByUserId: adminUser.id,
            },
          ],
        },
      },
    });
  }

  // 10. 35+ Sales Invoices (POS Counter Transactions)
  const paymentModes = ['CASH', 'UPI', 'CARD', 'SPLIT', 'CREDIT'];
  for (let i = 0; i < 35; i++) {
    const cust = createdCustomers[i % createdCustomers.length];
    const med1 = createdMedicines[i % createdMedicines.length];
    const med2 = createdMedicines[(i + 5) % createdMedicines.length];
    const batch1 = createdBatches[i % createdBatches.length];
    const batch2 = createdBatches[(i + 5) % createdBatches.length];

    const qty1 = 2 + (i % 4);
    const qty2 = 1 + (i % 3);
    const line1 = med1.defaultSellingPrice * qty1;
    const line2 = med2.defaultSellingPrice * qty2;
    const subtotal = line1 + line2;
    const taxAmount = ((line1 * med1.taxPercent) + (line2 * med2.taxPercent)) / 100;
    const totalAmount = subtotal + taxAmount;
    const invNum = `INV-2026-${String(i + 1).padStart(4, '0')}`;
    const mode = paymentModes[i % paymentModes.length];

    const invoice = await prisma.salesInvoice.upsert({
      where: { invoiceNumber: invNum },
      update: {},
      create: {
        invoiceNumber: invNum,
        branchId: mainBranch.id,
        customerId: cust.id,
        status: 'COMPLETED',
        subtotal,
        taxAmount,
        totalAmount,
        paymentStatus: mode === 'CREDIT' ? 'PENDING' : 'PAID',
        createdByUserId: adminUser.id,
        createdAt: new Date(today.getTime() - (i % 15) * 24 * 60 * 60 * 1000),
        items: {
          create: [
            {
              medicineId: med1.id,
              batchId: batch1.id,
              qty: qty1,
              rate: med1.defaultSellingPrice,
              mrp: med1.mrp,
              taxPercent: med1.taxPercent,
              taxableAmount: line1,
              cgstAmount: (line1 * (med1.taxPercent / 2)) / 100,
              sgstAmount: (line1 * (med1.taxPercent / 2)) / 100,
              lineTotal: line1 + (line1 * med1.taxPercent) / 100,
            },
            {
              medicineId: med2.id,
              batchId: batch2.id,
              qty: qty2,
              rate: med2.defaultSellingPrice,
              mrp: med2.mrp,
              taxPercent: med2.taxPercent,
              taxableAmount: line2,
              cgstAmount: (line2 * (med2.taxPercent / 2)) / 100,
              sgstAmount: (line2 * (med2.taxPercent / 2)) / 100,
              lineTotal: line2 + (line2 * med2.taxPercent) / 100,
            },
          ],
        },
        payments: mode !== 'CREDIT' ? {
          create: [
            {
              amount: totalAmount,
              paymentMode: mode,
              referenceNumber: `UPI-REC-${i + 2000}`,
              createdByUserId: adminUser.id,
            },
          ],
        } : undefined,
      },
    });

    // If Schedule H medicine, add Prescription record
    if (med1.isScheduleH || med2.isScheduleH) {
      await prisma.prescriptionRecord.upsert({
        where: { salesInvoiceId: invoice.id },
        update: {},
        create: {
          salesInvoiceId: invoice.id,
          doctorName: 'Dr. Anand Kulkarni, MBBS, MD',
          doctorRegNo: `MCI-${84720 + i}`,
          patientName: cust.name,
          patientAge: 32 + (i % 30),
          drugSchedule: 'SCHEDULE_H',
          dispensedAt: invoice.createdAt,
        },
      });
    }
  }

  // 11. 30+ Operational Expenses
  const expenseCategories = ['RENT', 'ELECTRICITY', 'STAFF_SALARY', 'MAINTENANCE', 'PACKAGING', 'TRANSPORTATION', 'MISCELLANEOUS'];
  for (let i = 0; i < 30; i++) {
    const cat = expenseCategories[i % expenseCategories.length];
    const amount = 500 + (i * 250);
    await prisma.expense.create({
      data: {
        branchId: i % 4 === 0 ? branch2.id : mainBranch.id,
        category: cat,
        amount,
        paymentMethod: i % 2 === 0 ? 'UPI' : 'CASH',
        notes: `Regular monthly ${cat.toLowerCase().replace('_', ' ')} settlement #${i + 1}`,
        createdByUserId: adminUser.id,
        date: new Date(today.getTime() - (i % 25) * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 12. 20+ Stock Transfers between Branches
  const transferStatuses = ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED'];
  for (let i = 0; i < 20; i++) {
    const med = createdMedicines[i % createdMedicines.length];
    const batch = createdBatches[i % createdBatches.length];
    const status = transferStatuses[i % transferStatuses.length];

    await prisma.stockTransfer.create({
      data: {
        fromBranchId: mainBranch.id,
        toBranchId: branch2.id,
        status,
        transferredByUserId: adminUser.id,
        receivedByUserId: status === 'RECEIVED' ? adminUser.id : null,
        notes: `Inter-branch inventory balancing transfer batch #${i + 1}`,
        items: {
          create: [
            {
              medicineId: med.id,
              batchId: batch.id,
              qty: 15 + (i * 2),
            },
          ],
        },
      },
    });
  }

  // 13. Active Cashier Shift for POS
  const activeShift = await prisma.cashierShift.findFirst({
    where: { userId: adminUser.id, status: 'OPEN' },
  });
  if (!activeShift) {
    await prisma.cashierShift.create({
      data: {
        branchId: mainBranch.id,
        userId: adminUser.id,
        status: 'OPEN',
        openingCash: 500.0,
        openedAt: new Date(),
        notes: 'Morning counter opening shift session',
      },
    });
  }

  console.log('✅ Successfully seeded 35+ items across all modules:');
  console.log(` - ${createdMedicines.length} Medicines`);
  console.log(` - ${createdBatches.length} Inventory Batches (Fresh, Near Expiry, Expired)`);
  console.log(` - ${createdCustomers.length} Customers`);
  console.log(` - ${createdSuppliers.length} Suppliers & Agencies`);
  console.log(` - 35 Purchase Orders & Inward Purchases`);
  console.log(` - 35 Sales Invoices & Counter Bills`);
  console.log(` - 30 Clinic & Store Expenses`);
  console.log(` - 20 Multi-Branch Stock Transfers`);
  console.log(` - Active POS Cashier Register`);
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
