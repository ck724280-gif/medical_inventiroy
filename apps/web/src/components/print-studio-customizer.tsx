'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Sliders,
  Sparkles,
  QrCode,
  Check,
  Eye,
  CheckCircle2,
  Palette,
  Loader2,
  Building2,
  User,
  Stethoscope,
  ShieldCheck,
  CreditCard,
  Truck,
  Layers,
  HeartPulse,
} from 'lucide-react';
import { formatCurrency } from '@medical-inventory/shared-utils';

export interface LayoutTheme {
  id: string;
  name: string;
  category: 'A4/A5 Standard' | 'Thermal POS' | 'Specialized & Compliance' | 'Modern Stylized';
  description: string;
  recommendedFor: string;
  badgeColor: string;
  accentColor: string;
  structure: string;
}

export const LAYOUT_THEMES: LayoutTheme[] = [
  {
    id: 'classic-bordered',
    name: '1. Classic Standard GST (Vyapar Style)',
    category: 'A4/A5 Standard',
    description: 'Double outer border, legal license header boxes, alternating rows & bottom 3-column split.',
    recommendedFor: 'Standard Retail & B2B Billing',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    accentColor: '#0f172a',
    structure: 'Double Bordered Box + Alternating Rows',
  },
  {
    id: 'modern-minimal',
    name: '2. Modern Minimalist (Zoho Style)',
    category: 'A4/A5 Standard',
    description: 'Frameless clean layout with left brand, right slate pill tags, and underline dividers.',
    recommendedFor: 'Modern Pharmacies & Clinics',
    badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    accentColor: '#0284c7',
    structure: 'Frameless + Right Pill Badge',
  },
  {
    id: 'corporate-navy',
    name: '3. Corporate Medical Navy (Tally Style)',
    category: 'A4/A5 Standard',
    description: 'Deep navy blue solid header banner with white typography and shaded summary container.',
    recommendedFor: 'Hospital Pharmacy & Large Chains',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    accentColor: '#1e3a8a',
    structure: 'Solid Dark Navy Top Banner',
  },
  {
    id: 'clinical-emerald',
    name: '4. Clinical Health Emerald',
    category: 'A4/A5 Standard',
    description: 'Healthcare green accents, CADUCEUS medical insignia, status pill badges & rounded card.',
    recommendedFor: 'Wellness & Specialty Care',
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    accentColor: '#059669',
    structure: 'Medical Cross Header + Status Badges',
  },
  {
    id: 'pharmacy-compact',
    name: '5. High-Density Express (Marg ERP Style)',
    category: 'A4/A5 Standard',
    description: 'Ultra-condensed monospace grid fitting 20+ medicines on a single sheet.',
    recommendedFor: 'High-Volume Dispensaries',
    badgeColor: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    accentColor: '#4338ca',
    structure: 'Dense Multi-Column Monospace Table',
  },
  {
    id: 'pos-thermal-classic',
    name: '6. POS Thermal Monospace (80mm)',
    category: 'Thermal POS',
    description: 'Classic receipt format with dashed line dividers, monospaced typography, and centered totals.',
    recommendedFor: '80mm Thermal Printers',
    badgeColor: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    accentColor: '#d97706',
    structure: 'Monospaced Dot-Matrix with Dashes',
  },
  {
    id: 'thermal-clean',
    name: '7. Thermal Ultra-Modern (Square Style 80mm)',
    category: 'Thermal POS',
    description: 'Clean divider-free modern thermal layout with bold item quantities and bottom UPI QR.',
    recommendedFor: 'Modern 80mm Retail POS',
    badgeColor: 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    accentColor: '#0d9488',
    structure: 'Sans-Serif Clean Spaced Thermal',
  },
  {
    id: 'thermal-mini',
    name: '8. Micro 58mm Pocket (Handheld Bluetooth)',
    category: 'Thermal POS',
    description: 'Ultra-narrow 2-inch format with stacked item rows (Qty x Rate) for portable billing.',
    recommendedFor: '58mm Handheld Bluetooth POS',
    badgeColor: 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    accentColor: '#7e22ce',
    structure: 'Narrow 2-Inch Stacked Rows',
  },
  {
    id: 'dark-executive',
    name: '9. Executive Dark & Gold Accent',
    category: 'Modern Stylized',
    description: 'Solid charcoal black header block with gold borders and elegant luxury styling.',
    recommendedFor: 'Premium Boutique Medical Stores',
    badgeColor: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200',
    accentColor: '#18181b',
    structure: 'Charcoal Black & Gold Accents',
  },
  {
    id: 'rx-integrated',
    name: '10. Prescription Rx Integrated',
    category: 'Specialized & Compliance',
    description: 'Prominent top Rx badge with Patient Vitals (Age/Gender/BP) and Doctor Reg # block.',
    recommendedFor: 'Doctor-Attached Dispensaries',
    badgeColor: 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    accentColor: '#e11d48',
    structure: 'Dedicated Doctor Rx Box & Patient Vitals',
  },
  {
    id: 'tax-matrix-detailed',
    name: '11. GST Full Compliance Matrix',
    category: 'Specialized & Compliance',
    description: 'Comprehensive secondary HSN/SAC, CGST, SGST, IGST tax breakdown matrix at bottom.',
    recommendedFor: 'GST-Audited & B2B Billing',
    badgeColor: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    accentColor: '#c2410c',
    structure: 'Secondary HSN/Tax Slab Table',
  },
  {
    id: 'upi-qr-focus',
    name: '12. UPI Instant Pay QR Focus',
    category: 'Modern Stylized',
    description: 'Prominent dynamic UPI QR code banner placed at top for instant contactless scan-to-pay.',
    recommendedFor: 'Fast Counter & Contactless Billing',
    badgeColor: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    accentColor: '#0891b2',
    structure: 'Top Centered Giant UPI QR Card',
  },
  {
    id: 'barcode-header',
    name: '13. Barcode Scannable Header',
    category: 'Specialized & Compliance',
    description: 'Giant Code128 invoice barcode across the header for fast POS returns and audit lookups.',
    recommendedFor: 'Automated Barcode Stores',
    badgeColor: 'bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
    accentColor: '#65a30d',
    structure: 'Full-Width Code128 Top Barcode',
  },
  {
    id: 'dual-signature',
    name: '14. Dual Authorized Signatory',
    category: 'Specialized & Compliance',
    description: 'Two large formal signatory boxes: Customer Receipt & Registered Pharmacist Stamp.',
    recommendedFor: 'Hospital & Institutional Supplies',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    accentColor: '#334155',
    structure: 'Dual Stamp & Signature Boxes',
  },
  {
    id: 'vintage-apothecary',
    name: '15. Vintage Apothecary Classic',
    category: 'Modern Stylized',
    description: 'Traditional Serif font, ornamental borders, Established header, and classic layout.',
    recommendedFor: 'Ayurvedic, Homeopathy & Classic Stores',
    badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    accentColor: '#78350f',
    structure: 'Serif Font + Ornamental Borders',
  },
  {
    id: 'bold-total-callout',
    name: '16. Bold Summary Mega-Box',
    category: 'Modern Stylized',
    description: 'Giant highlighted Grand Total callout box taking 30% of bill width for instant verification.',
    recommendedFor: 'Busy Cash Counters',
    badgeColor: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    accentColor: '#ca8a04',
    structure: 'Giant Highlighted Total Banner',
  },
  {
    id: 'hospital-inpatient',
    name: '17. Hospital Clinic IP/OP Patient Slip',
    category: 'Specialized & Compliance',
    description: 'Includes UHID/Patient ID, IPD/OPD No, Ward, Bed #, and Attending Consultant notes.',
    recommendedFor: 'Inpatient Hospital Billing',
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    accentColor: '#047857',
    structure: 'UHID / Bed / Ward / Consultant Header',
  },
  {
    id: 'wholesale-distribution',
    name: '18. B2B Wholesale & Transport Slip',
    category: 'Specialized & Compliance',
    description: 'Includes Billed To & Shipped To, Vehicle No, Transport Mode, and E-Way Bill #.',
    recommendedFor: 'Wholesale Stockists & Distributors',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    accentColor: '#1d4ed8',
    structure: 'Billed To + Shipped To Dual Boxes',
  },
  {
    id: 'eco-ink-saver',
    name: '19. Eco-Friendly Ink Saver',
    category: 'A4/A5 Standard',
    description: 'Zero background fills, hairline borders, engineered to minimize printer toner/ribbon usage.',
    recommendedFor: 'High-Volume Cost-Conscious Printing',
    badgeColor: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
    accentColor: '#57534e',
    structure: 'Hairline Lines + 0% Background Shading',
  },
  {
    id: 'modern-rounded-card',
    name: '20. Contemporary Rounded Card (Stripe Style)',
    category: 'Modern Stylized',
    description: 'Soft gray rounded card panels, colorful status pill tags, and modern typography.',
    recommendedFor: 'Boutique Healthcare Lounges',
    badgeColor: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    accentColor: '#0369a1',
    structure: 'Rounded Card Panels & Floating Summary',
  },
];

interface PrintStudioProps {
  initialData: any;
  businessData: any;
  onSave: (payload: any) => void;
  isSaving?: boolean;
}

export function PrintStudioCustomizer({
  initialData,
  businessData,
  onSave,
  isSaving,
}: PrintStudioProps) {
  const parsedDisplayFields = useMemo(() => {
    try {
      if (typeof initialData?.displayFields === 'string') {
        return JSON.parse(initialData.displayFields);
      }
      return initialData?.displayFields || {};
    } catch {
      return {};
    }
  }, [initialData]);

  const [paperWidth, setPaperWidth] = useState<string>(initialData?.paperWidth || '58mm');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    parsedDisplayFields.layoutTheme || (paperWidth === '58mm' ? 'thermal-mini' : paperWidth === '80mm' ? 'pos-thermal-classic' : 'classic-bordered')
  );

  const [showLogo, setShowLogo] = useState<boolean>(initialData?.showLogo ?? true);
  const [showGst, setShowGst] = useState<boolean>(initialData?.showGst ?? true);
  const [showLicense, setShowLicense] = useState<boolean>(initialData?.showLicense ?? true);
  const [showDoctor, setShowDoctor] = useState<boolean>(parsedDisplayFields.showDoctor ?? true);
  const [showCustomer, setShowCustomer] = useState<boolean>(parsedDisplayFields.showCustomer ?? true);
  const [showCustomerBalance, setShowCustomerBalance] = useState<boolean>(parsedDisplayFields.showCustomerBalance ?? true);
  const [showBatch, setShowBatch] = useState<boolean>(parsedDisplayFields.showBatch ?? true);
  const [showExpiry, setShowExpiry] = useState<boolean>(parsedDisplayFields.showExpiry ?? true);
  const [showHsn, setShowHsn] = useState<boolean>(parsedDisplayFields.showHsn ?? true);
  const [showMrp, setShowMrp] = useState<boolean>(parsedDisplayFields.showMrp ?? true);
  const [showDiscount, setShowDiscount] = useState<boolean>(parsedDisplayFields.showDiscount ?? true);
  const [showTax, setShowTax] = useState<boolean>(parsedDisplayFields.showTax ?? true);
  const [showQr, setShowQr] = useState<boolean>(parsedDisplayFields.showQr ?? true);
  const [showBarcode, setShowBarcode] = useState<boolean>(parsedDisplayFields.showBarcode ?? true);
  const [showSignature, setShowSignature] = useState<boolean>(parsedDisplayFields.showSignature ?? true);

  const [headerText, setHeaderText] = useState<string>(initialData?.headerText || 'MedCare Pharmacy & Healthcare');
  const [thankYouMessage, setThankYouMessage] = useState<string>(initialData?.thankYouMessage || 'Thank You! Get Well Soon');
  const [returnPolicy, setReturnPolicy] = useState<string>(
    initialData?.returnPolicy || 'Medicines once sold can only be returned within 7 days with original invoice. Cold chain items non-returnable.'
  );

  const selectedLayout = useMemo(
    () => LAYOUT_THEMES.find((l) => l.id === selectedLayoutId) || LAYOUT_THEMES[0],
    [selectedLayoutId]
  );

  const handleSave = () => {
    const payload = {
      name: selectedLayout.name + ' (' + paperWidth + ')',
      paperWidth,
      showLogo,
      showGst,
      showLicense,
      headerText,
      thankYouMessage,
      returnPolicy,
      displayFields: {
        layoutTheme: selectedLayoutId,
        showDoctor,
        showCustomer,
        showCustomerBalance,
        showBatch,
        showExpiry,
        showHsn,
        showMrp,
        showDiscount,
        showTax,
        showQr,
        showBarcode,
        showSignature,
      },
    };
    onSave(payload);
  };

  const mockInvoice = {
    invoiceNumber: 'INV-2026-0842',
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: '14:32:10',
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    customerAddress: 'B-402, Green Park Avenue, Main Road',
    customerGstin: '27AABCS1429B1ZB',
    doctorName: 'Dr. A. K. Verma, MD (Med)',
    doctorRegNo: 'MCI-54892',
    patientAge: '38 Yrs / Male',
    patientUhid: 'UHID-882190',
    wardBed: 'Ward 4B / Bed 12',
    vehicleNo: 'MH-04-AB-9921',
    ewayBill: 'EWB-8849102941',
    items: [
      {
        name: 'Paracetamol 650mg (Dolo)',
        generic: 'Paracetamol IP 650mg',
        batch: 'BT-2601',
        expiry: '12/2027',
        hsn: '300490',
        qty: 15,
        unit: 'TAB',
        mrp: 32.0,
        rate: 28.5,
        discount: 2.5,
        taxPercent: 12,
        amount: 400.43,
      },
      {
        name: 'Amoxicillin + Clav 625mg (Augmentin)',
        generic: 'Amoxicillin Trihydrate + Potassium Clavulanate',
        batch: 'AMX-994',
        expiry: '10/2026',
        hsn: '300410',
        qty: 10,
        unit: 'TAB',
        mrp: 180.0,
        rate: 160.0,
        discount: 10.0,
        taxPercent: 12,
        amount: 1440.0,
      },
      {
        name: 'Pantoprazole 40mg (Pan-40)',
        generic: 'Pantoprazole Sodium Gastro-resistant',
        batch: 'PNT-330',
        expiry: '02/2028',
        hsn: '300490',
        qty: 10,
        unit: 'TAB',
        mrp: 95.0,
        rate: 85.0,
        discount: 5.0,
        taxPercent: 12,
        amount: 807.5,
      },
    ],
    subtotal: 2647.93,
    discountAmount: 70.0,
    cgst: 148.68,
    sgst: 148.68,
    grandTotal: 2875.29,
    paidAmount: 2875.29,
    balanceDue: 0.0,
    outstandingBalance: 350.0,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ── Left Controls: Paper Size, 20 Themes, Field Toggles ── */}
      <div className="lg:col-span-6 space-y-5">
        {/* 1. Paper Size Selector */}
        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            1. Select Paper Size &amp; Printer Target
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: '58mm', label: '58mm Thermal', sub: 'Handheld / Bluetooth POS' },
              { id: '80mm', label: '80mm Thermal', sub: 'Desktop POS 3-inch Roll' },
              { id: 'A5', label: 'A5 Half Page', sub: 'Counter Pharmacy Bill' },
              { id: 'A4', label: 'A4 Full Page', sub: 'GST Tax Laser Invoice' },
            ].map((p) => {
              const active = paperWidth === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperWidth(p.id)}
                  className={'p-3 rounded-xl border text-left transition cursor-pointer ' + (
                    active
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-[#090d16]'
                  )}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{p.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{p.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 20 Layout Themes Grid */}
        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              2. Choose Layout Architecture (20 Completely Unique Designs)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Selected: <b className="text-sky-600 dark:text-sky-400">{selectedLayout.name}</b>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {LAYOUT_THEMES.map((theme) => {
              const active = selectedLayoutId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedLayoutId(theme.id)}
                  className={'p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ' + (
                    active
                      ? 'border-sky-600 bg-sky-50/80 dark:bg-sky-950/60 ring-2 ring-sky-500/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#090d16]'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{theme.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{theme.description}</p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-sky-700 dark:text-sky-400 text-[9px] font-semibold">{theme.structure}</span>
                    {active && <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Field Visibility Toggles */}
        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <label className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            3. Field Visibility &amp; Print Switches
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="rounded text-sky-600" />
              <span>Store Logo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showGst} onChange={(e) => setShowGst(e.target.checked)} className="rounded text-sky-600" />
              <span>Store GSTIN</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showLicense} onChange={(e) => setShowLicense(e.target.checked)} className="rounded text-sky-600" />
              <span>Drug License #</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showDoctor} onChange={(e) => setShowDoctor(e.target.checked)} className="rounded text-sky-600" />
              <span>Doctor Rx &amp; Reg #</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showCustomer} onChange={(e) => setShowCustomer(e.target.checked)} className="rounded text-sky-600" />
              <span>Patient / Customer Info</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showCustomerBalance} onChange={(e) => setShowCustomerBalance(e.target.checked)} className="rounded text-sky-600" />
              <span>Customer Due Balance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showBatch} onChange={(e) => setShowBatch(e.target.checked)} className="rounded text-sky-600" />
              <span>Batch Number</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showExpiry} onChange={(e) => setShowExpiry(e.target.checked)} className="rounded text-sky-600" />
              <span>Expiry Date</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showHsn} onChange={(e) => setShowHsn(e.target.checked)} className="rounded text-sky-600" />
              <span>HSN Code</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showMrp} onChange={(e) => setShowMrp(e.target.checked)} className="rounded text-sky-600" />
              <span>MRP Column</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showDiscount} onChange={(e) => setShowDiscount(e.target.checked)} className="rounded text-sky-600" />
              <span>Discount Column</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showTax} onChange={(e) => setShowTax(e.target.checked)} className="rounded text-sky-600" />
              <span>Tax / GST Column</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="rounded text-sky-600" />
              <span>UPI Payment QR Code</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} className="rounded text-sky-600" />
              <span>Invoice Barcode</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} className="rounded text-sky-600" />
              <span>Pharmacist Sign-off</span>
            </label>
          </div>
        </div>

        {/* 4. Header & Footer Greetings */}
        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            4. Header Greeting &amp; Return Terms
          </label>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Header Title / Welcome Text</label>
              <input
                type="text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Thank You Greeting</label>
              <input
                type="text"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Terms &amp; Conditions / Return Policy</label>
              <textarea
                rows={2}
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isSaving ? 'Saving Template...' : 'Save ' + selectedLayout.name + ' Template'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Live Real-Time Invoice Simulator with 20 Distinct Layouts ──────────── */}
      <div className="lg:col-span-6 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Live Layout Engine Simulator
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {paperWidth} | {selectedLayout.name}
          </span>
        </div>

        {/* Paper Container Simulator */}
        <div className="bg-slate-200/70 dark:bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-300 dark:border-slate-800 flex justify-center max-h-[880px] overflow-y-auto shadow-inner">
          <div
            className={'bg-white text-slate-900 shadow-2xl transition-all duration-300 p-4 select-none ' + (
              paperWidth === '58mm'
                ? 'w-[270px] text-[9.5px] rounded-lg'
                : paperWidth === '80mm'
                ? 'w-[350px] text-[10.5px] rounded-xl'
                : paperWidth === 'A5'
                ? 'w-[450px] text-[11px] rounded-xl'
                : 'w-[540px] text-xs rounded-xl'
            ) + ' ' + (selectedLayoutId === 'vintage-apothecary' ? 'font-serif' : selectedLayoutId === 'pharmacy-compact' || selectedLayoutId === 'pos-thermal-classic' ? 'font-mono' : 'font-sans')}
            style={{
              borderColor: selectedLayoutId === 'vintage-apothecary' ? '#78350f' : selectedLayoutId === 'eco-ink-saver' ? '#444' : selectedLayout.accentColor,
              borderWidth: selectedLayoutId === 'classic-bordered' ? '3px' : selectedLayoutId === 'vintage-apothecary' ? '4px' : '1px',
              borderStyle: selectedLayoutId === 'classic-bordered' ? 'double' : selectedLayoutId === 'vintage-apothecary' ? 'ridge' : 'solid',
            }}
          >
            {/* ══════════════ 1. HEADER SECTION (Varies by Layout) ══════════════ */}
            {selectedLayoutId === 'corporate-navy' ? (
              <div className="bg-[#1e3a8a] text-white p-3 -mx-4 -mt-4 mb-3 rounded-t-xl text-center space-y-1">
                <h2 className="font-extrabold text-sm tracking-wider uppercase">{businessData?.name || headerText}</h2>
                <p className="text-[10px] text-blue-200">{businessData?.address || 'Medical Complex, Main Road'}, {businessData?.city || 'City'}</p>
                <div className="flex justify-center gap-3 text-[9px] font-mono text-blue-100">
                  {showGst && <span>GSTIN: {businessData?.gstNumber || '22AAAAA0000A1Z5'}</span>}
                  {showLicense && <span>DL: {businessData?.pharmacyLicense || 'DL-20B-12345'}</span>}
                </div>
              </div>
            ) : selectedLayoutId === 'dark-executive' ? (
              <div className="bg-[#18181b] text-white p-3.5 -mx-4 -mt-4 mb-3 rounded-t-xl border-b-2 border-amber-500 text-center space-y-1">
                <h2 className="font-extrabold text-sm tracking-widest text-amber-400 uppercase">{businessData?.name || headerText}</h2>
                <p className="text-[9.5px] text-zinc-300">{businessData?.address || '123 Medical Boulevard'}, {businessData?.city || 'City'}</p>
                <div className="flex justify-center gap-4 text-[9px] font-mono text-amber-200">
                  {showGst && <span>GST: {businessData?.gstNumber || '22AAAAA0000A1Z5'}</span>}
                  {showLicense && <span>LIC: {businessData?.pharmacyLicense || 'DL-20B-12345'}</span>}
                </div>
              </div>
            ) : selectedLayoutId === 'clinical-emerald' ? (
              <div className="border-b-2 border-emerald-500 pb-2 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center justify-center text-base">✚</div>
                  <div>
                    <h2 className="font-extrabold text-xs text-emerald-950 uppercase">{businessData?.name || headerText}</h2>
                    <p className="text-[9px] text-emerald-700">{businessData?.phone || '+91 98765 43210'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px]">TAX INVOICE</span>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">{mockInvoice.invoiceNumber}</div>
                </div>
              </div>
            ) : selectedLayoutId === 'upi-qr-focus' ? (
              <div className="pb-3 mb-2 border-b border-slate-200 text-center space-y-2">
                <h2 className="font-extrabold text-sm text-slate-900 uppercase">{businessData?.name || headerText}</h2>
                <div className="bg-cyan-50 border border-cyan-300 rounded-xl p-2 max-w-[200px] mx-auto flex flex-col items-center shadow-sm">
                  <div className="w-16 h-16 bg-white p-1 rounded border border-cyan-400 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-cyan-900" />
                  </div>
                  <span className="text-[8.5px] font-bold text-cyan-900 mt-1">SCAN &amp; PAY ₹{mockInvoice.grandTotal}</span>
                </div>
              </div>
            ) : selectedLayoutId === 'barcode-header' ? (
              <div className="pb-2 mb-2 border-b border-slate-300 text-center space-y-1">
                <div className="bg-slate-100 py-1 px-3 rounded border border-slate-300 inline-block font-mono font-bold text-sm tracking-widest">
                  |||||| | ||||| || |||||| | ||||
                </div>
                <div className="text-[9px] font-mono text-slate-600">*{mockInvoice.invoiceNumber}*</div>
                <h2 className="font-extrabold text-xs text-slate-900 uppercase">{businessData?.name || headerText}</h2>
              </div>
            ) : selectedLayoutId === 'vintage-apothecary' ? (
              <div className="text-center pb-2 mb-2 border-b-2 border-amber-900 space-y-0.5">
                <p className="text-[9px] italic text-amber-900">~ ESTD. 2026 • APOTHECARY &amp; DISPENSARY ~</p>
                <h2 className="font-black text-sm tracking-wide text-amber-950 uppercase">{businessData?.name || headerText}</h2>
                <p className="text-[9px] text-amber-900">{businessData?.address || 'Main Road'} • Ph: {businessData?.phone || '+91 98765 43210'}</p>
              </div>
            ) : selectedLayoutId === 'rx-integrated' ? (
              <div className="pb-2 mb-2 border-b-2 border-rose-500 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-rose-600 font-serif">℞</span>
                    <h2 className="font-extrabold text-xs text-slate-900 uppercase">{businessData?.name || headerText}</h2>
                  </div>
                  <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[9px]">PRESCRIPTION BILL</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-1 pb-2.5 border-b border-slate-200">
                {showLogo && businessData?.logo && (
                  <img src={businessData.logo} alt="Logo" className="w-10 h-10 object-contain mx-auto mb-1 rounded" />
                )}
                <h2 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">{businessData?.name || headerText}</h2>
                <p className="text-[10px] text-slate-600">{businessData?.address || '123 Health Complex'}, {businessData?.city || 'City'}</p>
                {(showGst || showLicense) && (
                  <div className="flex flex-wrap justify-center gap-x-3 text-[9px] font-mono text-slate-700">
                    {showGst && <span>GSTIN: {businessData?.gstNumber || '22AAAAA0000A1Z5'}</span>}
                    {showLicense && <span>DL: {businessData?.pharmacyLicense || 'DL-20B-12345'}</span>}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ 2. PATIENT / DOCTOR / INVOICE METADATA ══════════════ */}
            {selectedLayoutId === 'hospital-inpatient' ? (
              <div className="p-2 my-2 bg-emerald-50/70 border border-emerald-200 rounded text-[9.5px] space-y-1">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <span>Patient UHID: <b>{mockInvoice.patientUhid}</b></span>
                  <span>IP/OP Ward: <b>{mockInvoice.wardBed}</b></span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span>Patient: <b>{mockInvoice.customerName}</b> ({mockInvoice.patientAge})</span>
                  <span>Consultant: <b>{mockInvoice.doctorName}</b></span>
                </div>
              </div>
            ) : selectedLayoutId === 'wholesale-distribution' ? (
              <div className="grid grid-cols-2 gap-2 p-2 my-2 bg-blue-50/70 border border-blue-200 rounded text-[9px]">
                <div>
                  <b className="text-blue-900 block border-b border-blue-200 pb-0.5">BILLED TO (BUYER):</b>
                  <div>{mockInvoice.customerName}</div>
                  <div>GSTIN: {mockInvoice.customerGstin}</div>
                </div>
                <div>
                  <b className="text-blue-900 block border-b border-blue-200 pb-0.5">TRANSPORT / DISPATCH:</b>
                  <div>Veh No: {mockInvoice.vehicleNo}</div>
                  <div>E-Way: {mockInvoice.ewayBill}</div>
                </div>
              </div>
            ) : selectedLayoutId === 'rx-integrated' ? (
              <div className="p-2 my-2 bg-rose-50/60 border border-rose-200 rounded text-[9.5px] space-y-1">
                <div className="flex justify-between">
                  <span>Patient: <b>{mockInvoice.customerName}</b></span>
                  <span>Age/Sex: <b>{mockInvoice.patientAge}</b></span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Prescribed By: <b>{mockInvoice.doctorName}</b></span>
                  <span className="font-mono">Reg: {mockInvoice.doctorRegNo}</span>
                </div>
              </div>
            ) : (
              <div className="py-2 border-b border-slate-200 space-y-1 text-[9.5px]">
                <div className="flex justify-between font-mono font-bold">
                  <span>Inv: {mockInvoice.invoiceNumber}</span>
                  <span>Date: {mockInvoice.date}</span>
                </div>
                {showCustomer && (
                  <div className="flex justify-between text-slate-700">
                    <span>Patient: <b>{mockInvoice.customerName}</b></span>
                    <span>Ph: {mockInvoice.customerPhone}</span>
                  </div>
                )}
                {showDoctor && (
                  <div className="text-[9px] text-slate-500 flex justify-between">
                    <span>Dr: {mockInvoice.doctorName}</span>
                    <span>Reg: {mockInvoice.doctorRegNo}</span>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ 3. ITEM TABLE (Varies by Layout) ══════════════ */}
            <div className="py-2">
              <table className="w-full text-left text-[9.5px]">
                <thead className={
                  selectedLayoutId === 'corporate-navy' ? 'bg-blue-100 text-blue-950 uppercase font-bold'
                  : selectedLayoutId === 'clinical-emerald' ? 'bg-emerald-100 text-emerald-950 uppercase font-bold'
                  : selectedLayoutId === 'dark-executive' ? 'bg-zinc-900 text-amber-400 uppercase font-bold'
                  : selectedLayoutId === 'pos-thermal-classic' ? 'border-b border-dashed border-black font-mono'
                  : selectedLayoutId === 'eco-ink-saver' ? 'border-b border-black font-semibold'
                  : 'border-b border-slate-300 text-slate-600 uppercase font-semibold'
                }>
                  <tr>
                    <th className="py-1 px-1">Item Description</th>
                    {showBatch && <th className="py-1 px-1">Batch</th>}
                    {showExpiry && <th className="py-1 px-1">Exp</th>}
                    <th className="py-1 px-1 text-center">Qty</th>
                    {showMrp && <th className="py-1 px-1 text-right">MRP</th>}
                    <th className="py-1 px-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className={selectedLayoutId === 'classic-bordered' ? 'divide-y divide-slate-200 [&>*:nth-child(even)]:bg-slate-50' : 'divide-y divide-slate-100'}>
                  {mockInvoice.items.map((it, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 px-1">
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        {selectedLayoutId === 'rx-integrated' && <div className="text-[8px] text-rose-600 italic">1 Tab Morning &amp; Night after food</div>}
                        {showHsn && <div className="text-[8px] text-slate-400 font-mono">HSN: {it.hsn}</div>}
                      </td>
                      {showBatch && <td className="py-1 px-1 font-mono text-[9px] text-slate-600">{it.batch}</td>}
                      {showExpiry && <td className="py-1 px-1 font-mono text-[9px] text-slate-500">{it.expiry}</td>}
                      <td className="py-1 px-1 text-center font-bold font-mono">{it.qty}</td>
                      {showMrp && <td className="py-1 px-1 text-right font-mono text-slate-600">{it.mrp.toFixed(2)}</td>}
                      <td className="py-1 px-1 text-right font-bold font-mono text-slate-900">{it.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ══════════════ 4. SECONDARY HSN COMPLIANCE MATRIX (For layout 11) ══════════════ */}
            {selectedLayoutId === 'tax-matrix-detailed' && (
              <div className="my-2 border border-slate-300 rounded p-1 text-[8px] font-mono">
                <div className="font-bold text-slate-700 border-b border-slate-300 pb-0.5 mb-1">GST TAX DISTRIBUTION MATRIX</div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500">
                      <th>HSN</th>
                      <th>Taxable</th>
                      <th>CGST%</th>
                      <th>CGST Amt</th>
                      <th>SGST%</th>
                      <th>SGST Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>300490</td>
                      <td>₹2,320.98</td>
                      <td>6%</td>
                      <td>₹139.26</td>
                      <td>6%</td>
                      <td>₹139.26</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ══════════════ 5. TOTALS & SUMMARY ══════════════ */}
            <div className="pt-2 border-t border-slate-300 space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({mockInvoice.items.length} Items)</span>
                <span className="font-mono">{formatCurrency(mockInvoice.subtotal)}</span>
              </div>
              {showDiscount && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Special Discount Savings (-)</span>
                  <span className="font-mono">-{formatCurrency(mockInvoice.discountAmount)}</span>
                </div>
              )}
              {showTax && (
                <div className="flex justify-between text-slate-600 text-[9px] font-mono">
                  <span>GST Breakdown (CGST 6% + SGST 6%)</span>
                  <span>{formatCurrency(mockInvoice.cgst + mockInvoice.sgst)}</span>
                </div>
              )}

              {/* Grand Total Callout */}
              {selectedLayoutId === 'bold-total-callout' ? (
                <div className="my-2 p-3 bg-amber-400 text-slate-950 border-2 border-amber-600 rounded-xl text-center shadow-md">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider">NET PAYABLE AMOUNT</div>
                  <div className="text-lg font-black font-mono">{formatCurrency(mockInvoice.grandTotal)}</div>
                  <div className="text-[8.5px] font-bold text-amber-900 mt-0.5">YOU SAVED ₹70.00 ON THIS PURCHASE</div>
                </div>
              ) : (
                <div className={'flex justify-between items-center py-1.5 px-2 rounded font-bold text-xs mt-1 ' + (
                  selectedLayoutId === 'corporate-navy' ? 'bg-[#1e3a8a] text-white'
                  : selectedLayoutId === 'clinical-emerald' ? 'bg-emerald-700 text-white'
                  : selectedLayoutId === 'dark-executive' ? 'bg-zinc-950 text-amber-400 border border-amber-500'
                  : 'bg-slate-900 text-white'
                )}>
                  <span>Grand Total:</span>
                  <span className="font-mono text-sm">{formatCurrency(mockInvoice.grandTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-[9px] text-slate-600 pt-0.5">
                <span>Payment Mode: <b>CASH / UPI</b></span>
                <span>Amount Paid: <b>{formatCurrency(mockInvoice.paidAmount)}</b></span>
              </div>
            </div>

            {/* ══════════════ 6. SIGNATURE & STAMP FOOTER (For Layout 14 & Others) ══════════════ */}
            {selectedLayoutId === 'dual-signature' ? (
              <div className="grid grid-cols-2 gap-3 pt-4 my-2 border-t border-slate-300 text-[8.5px] text-center">
                <div className="border border-dashed border-slate-400 p-2 rounded">
                  <div className="h-6"></div>
                  <b className="block border-t border-slate-400 pt-1">Patient / Customer Sign</b>
                </div>
                <div className="border border-dashed border-slate-400 p-2 rounded">
                  <div className="h-6"></div>
                  <b className="block border-t border-slate-400 pt-1">Pharmacist Sign &amp; Stamp</b>
                </div>
              </div>
            ) : showSignature ? (
              <div className="pt-3 flex justify-between text-[8.5px] text-slate-700 border-t border-slate-200 mt-2">
                <span>Customer Signature</span>
                <span>Authorized Pharmacist</span>
              </div>
            ) : null}

            {/* Footer / Greeting */}
            <div className="pt-2 border-t border-slate-200 text-center space-y-0.5 text-[8px] text-slate-500 mt-2">
              <p className="font-bold text-slate-800">{thankYouMessage}</p>
              <p className="leading-tight">{returnPolicy}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
