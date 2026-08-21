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
}

export const LAYOUT_THEMES: LayoutTheme[] = [
  {
    id: 'classic-bordered',
    name: '1. Classic Standard GST',
    category: 'A4/A5 Standard',
    description: 'Structured grid with double borders, formal header, and complete tax table.',
    recommendedFor: 'Standard Retail & B2B Billing',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    accentColor: '#0f172a',
  },
  {
    id: 'modern-minimal',
    name: '2. Modern Minimalist',
    category: 'A4/A5 Standard',
    description: 'Clean typographic layout with subtle dividers and generous whitespace.',
    recommendedFor: 'Modern Pharmacies & Clinics',
    badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    accentColor: '#0284c7',
  },
  {
    id: 'corporate-navy',
    name: '3. Corporate Medical Navy',
    category: 'A4/A5 Standard',
    description: 'Deep navy header banner with white lettering and shaded summary cards.',
    recommendedFor: 'Hospital Pharmacy & Large Chains',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    accentColor: '#1e3a8a',
  },
  {
    id: 'clinical-emerald',
    name: '4. Clinical Health Emerald',
    category: 'A4/A5 Standard',
    description: 'Fresh healthcare emerald green accents, status pill badges, and clean rows.',
    recommendedFor: 'Wellness & Specialty Care',
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    accentColor: '#059669',
  },
  {
    id: 'pharmacy-compact',
    name: '5. High-Density Express',
    category: 'A4/A5 Standard',
    description: 'Compact row spacing and dense columns to fit 20+ medicines on a single sheet.',
    recommendedFor: 'High-Volume Dispensaries',
    badgeColor: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    accentColor: '#4338ca',
  },
  {
    id: 'pos-thermal-classic',
    name: '6. POS Thermal Monospace',
    category: 'Thermal POS',
    description: 'Traditional receipt format with dashed line dividers and monospaced typography.',
    recommendedFor: '80mm / 58mm Thermal Printers',
    badgeColor: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    accentColor: '#d97706',
  },
  {
    id: 'thermal-clean',
    name: '7. Thermal Ultra-Modern',
    category: 'Thermal POS',
    description: 'Divider-free modern thermal layout with bold item quantities and totals.',
    recommendedFor: '80mm Retail POS',
    badgeColor: 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    accentColor: '#0d9488',
  },
  {
    id: 'thermal-mini',
    name: '8. Micro 58mm Pocket',
    category: 'Thermal POS',
    description: 'Ultra-narrow 2-inch format tailored for Bluetooth mobile handheld billing.',
    recommendedFor: '58mm Handheld Bluetooth POS',
    badgeColor: 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    accentColor: '#7e22ce',
  },
  {
    id: 'dark-executive',
    name: '9. Executive Dark Accent',
    category: 'Modern Stylized',
    description: 'Charcoal black top banner with gold/silver accents and bold branding.',
    recommendedFor: 'Premium Boutique Medical Stores',
    badgeColor: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200',
    accentColor: '#18181b',
  },
  {
    id: 'rx-integrated',
    name: '10. Prescription Rx Integrated',
    category: 'Specialized & Compliance',
    description: 'Dedicated Doctor Rx box with patient age/gender and diagnosis section.',
    recommendedFor: 'Doctor-Attached Dispensaries',
    badgeColor: 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    accentColor: '#e11d48',
  },
  {
    id: 'tax-matrix-detailed',
    name: '11. GST Compliance Matrix',
    category: 'Specialized & Compliance',
    description: 'Comprehensive HSN/SAC, CGST, SGST, IGST tax breakdown matrix at bottom.',
    recommendedFor: 'GST-Audited & B2B Billing',
    badgeColor: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    accentColor: '#c2410c',
  },
  {
    id: 'upi-qr-focus',
    name: '12. UPI Instant Pay QR',
    category: 'Modern Stylized',
    description: 'Prominent dynamic UPI QR code placed for instant customer scan-to-pay.',
    recommendedFor: 'Fast Contactless Counter Billing',
    badgeColor: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    accentColor: '#0891b2',
  },
  {
    id: 'barcode-header',
    name: '13. Barcode Scannable Header',
    category: 'Specialized & Compliance',
    description: 'Top scannable Code128 invoice barcode for fast POS returns and audit lookups.',
    recommendedFor: 'Automated Barcode Stores',
    badgeColor: 'bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
    accentColor: '#65a30d',
  },
  {
    id: 'dual-signature',
    name: '14. Dual Authorized Signatory',
    category: 'Specialized & Compliance',
    description: 'Formal Pharmacist & Customer signature boxes with stamp area.',
    recommendedFor: 'Hospital & Institutional Supplies',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    accentColor: '#334155',
  },
  {
    id: 'vintage-apothecary',
    name: '15. Vintage Apothecary',
    category: 'Modern Stylized',
    description: 'Classic apothecary serif font, ornamental borders, and traditional layout.',
    recommendedFor: 'Ayurvedic, Homeopathy & Classic Stores',
    badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    accentColor: '#78350f',
  },
  {
    id: 'bold-total-callout',
    name: '16. Bold Summary Box',
    category: 'Modern Stylized',
    description: 'Giant highlighted Grand Total callout box for easy customer payment verification.',
    recommendedFor: 'Busy Cash Counters',
    badgeColor: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    accentColor: '#ca8a04',
  },
  {
    id: 'hospital-inpatient',
    name: '17. Hospital Clinic IP/OP',
    category: 'Specialized & Compliance',
    description: 'Includes Bed/Ward/IPD number, Attending Consultant, and Room details.',
    recommendedFor: 'Inpatient Hospital Billing',
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    accentColor: '#047857',
  },
  {
    id: 'wholesale-distribution',
    name: '18. B2B Wholesale & Transport',
    category: 'Specialized & Compliance',
    description: 'Includes Vehicle No, Transport Mode, E-Way Bill #, Reverse Charge indicators.',
    recommendedFor: 'Wholesale Stockists & Distributors',
    badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    accentColor: '#1d4ed8',
  },
  {
    id: 'eco-ink-saver',
    name: '19. Eco Ink Saver',
    category: 'A4/A5 Standard',
    description: 'Zero background shading, hairline borders, engineered to minimize printer toner usage.',
    recommendedFor: 'Cost-Conscious High-Volume Printing',
    badgeColor: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
    accentColor: '#57534e',
  },
  {
    id: 'modern-rounded-card',
    name: '20. Contemporary Rounded Card',
    category: 'Modern Stylized',
    description: 'Rounded summary cards, soft background bands, and modern typography.',
    recommendedFor: 'Boutique Healthcare Lounges',
    badgeColor: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    accentColor: '#0369a1',
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
      if (typeof initialData?.displayFields === "string") {
        return JSON.parse(initialData.displayFields);
      }
      return initialData?.displayFields || {};
    } catch {
      return {};
    }
  }, [initialData]);

  const [paperWidth, setPaperWidth] = useState<string>(initialData?.paperWidth || "58mm");
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    parsedDisplayFields.layoutTheme || (paperWidth === "58mm" ? "thermal-mini" : paperWidth === "80mm" ? "pos-thermal-classic" : "classic-bordered")
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

  const [headerText, setHeaderText] = useState<string>(initialData?.headerText || "MedCare Pharmacy & Healthcare");
  const [thankYouMessage, setThankYouMessage] = useState<string>(initialData?.thankYouMessage || "Thank You! Get Well Soon");
  const [returnPolicy, setReturnPolicy] = useState<string>(
    initialData?.returnPolicy || "Medicines once sold can only be returned within 7 days with original invoice. Cold chain items non-returnable."
  );

  const selectedLayout = useMemo(
    () => LAYOUT_THEMES.find((l) => l.id === selectedLayoutId) || LAYOUT_THEMES[0],
    [selectedLayoutId]
  );

  const handleSave = () => {
    const payload = {
      name: selectedLayout.name + " (" + paperWidth + ")",
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
    invoiceNumber: "INV-2026-0842",
    date: new Date().toISOString(),
    customerName: "Rahul Sharma",
    customerPhone: "+91 98765 43210",
    customerAddress: "B-402, Green Park Avenue, City",
    doctorName: "Dr. A. K. Verma, MD (Med)",
    doctorRegNo: "MCI-54892",
    items: [
      {
        name: "Paracetamol 650mg (Dolo)",
        batch: "BT-2601",
        expiry: "2027-12",
        hsn: "3004",
        qty: 15,
        unit: "TAB",
        mrp: 32.0,
        rate: 28.5,
        discount: 2.5,
        taxPercent: 12,
        amount: 400.43,
      },
      {
        name: "Amoxicillin + Clav 625mg",
        batch: "AMX-994",
        expiry: "2026-10",
        hsn: "3004",
        qty: 10,
        unit: "TAB",
        mrp: 180.0,
        rate: 160.0,
        discount: 10.0,
        taxPercent: 12,
        amount: 1440.0,
      },
      {
        name: "Pantoprazole 40mg (Pan-40)",
        batch: "PNT-330",
        expiry: "2028-02",
        hsn: "3004",
        qty: 10,
        unit: "TAB",
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
      <div className="lg:col-span-7 space-y-5">
        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            1. Select Paper Size &amp; Printer Target
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "58mm", label: "58mm Thermal", sub: "Handheld / Bluetooth POS" },
              { id: "80mm", label: "80mm Thermal", sub: "Desktop POS 3-inch Roll" },
              { id: "A5", label: "A5 Half Page", sub: "Counter Pharmacy Bill" },
              { id: "A4", label: "A4 Full Page", sub: "GST Tax Laser Invoice" },
            ].map((p) => {
              const active = paperWidth === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperWidth(p.id)}
                  className={"p-3 rounded-xl border text-left transition cursor-pointer " + (
                    active
                      ? "border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-[#090d16]"
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

        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              2. Choose Layout Template Theme (20 Professional Styles)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Active: <b className="text-sky-600 dark:text-sky-400">{selectedLayout.name}</b>
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
                  className={"p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer " + (
                    active
                      ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/50 ring-2 ring-sky-500/20 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#090d16]"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{theme.name}</span>
                      <span className={"px-1.5 py-0.5 rounded text-[9px] font-semibold " + theme.badgeColor}>
                        {theme.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{theme.description}</p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Rec: {theme.recommendedFor}</span>
                    {active && <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
              {isSaving ? "Saving Template..." : "Save " + selectedLayout.name + " Template"}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Live Print Simulator
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {paperWidth} | {selectedLayout.name}
          </span>
        </div>

        <div className="bg-slate-200/70 dark:bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-300 dark:border-slate-800 flex justify-center max-h-[850px] overflow-y-auto shadow-inner">
          <div
            className={"bg-white text-slate-900 shadow-xl transition-all duration-300 p-4 font-sans select-none " + (
              paperWidth === "58mm"
                ? "w-[260px] text-[10px] rounded-lg"
                : paperWidth === "80mm"
                ? "w-[340px] text-[11px] rounded-xl"
                : paperWidth === "A5"
                ? "w-[440px] text-[11px] rounded-xl"
                : "w-[520px] text-xs rounded-xl"
            )}
            style={{
              borderColor: selectedLayout.accentColor,
              borderTopWidth: ["corporate-navy", "dark-executive", "clinical-emerald"].includes(selectedLayoutId) ? "6px" : "1px",
            }}
          >
            <div className="text-center space-y-1 pb-3 border-b border-slate-200">
              {showLogo && businessData?.logo && (
                <img
                  src={businessData.logo}
                  alt="Logo"
                  className="w-12 h-12 object-contain mx-auto mb-1 rounded"
                />
              )}
              <h2 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">
                {businessData?.name || headerText}
              </h2>
              {businessData?.description && (
                <p className="text-[9px] text-slate-500 italic">{businessData.description}</p>
              )}
              <p className="text-[10px] text-slate-600">
                {businessData?.address || "123 Medical Complex, Health Avenue"}, {businessData?.city || "City"}
              </p>
              <p className="text-[10px] text-slate-600">
                Ph: {businessData?.phone || "+91 98765 43210"} | Email: {businessData?.email || "store@pharmacy.com"}
              </p>

              {(showGst || showLicense) && (
                <div className="flex flex-wrap justify-center gap-x-3 text-[9px] font-mono text-slate-700 pt-0.5">
                  {showGst && <span>GSTIN: {businessData?.gstNumber || "22AAAAA0000A1Z5"}</span>}
                  {showLicense && <span>DL No: {businessData?.pharmacyLicense || "DL-20B-12345"}</span>}
                </div>
              )}
            </div>

            <div className="py-2.5 border-b border-slate-200 space-y-1.5 text-[10px]">
              <div className="flex justify-between font-mono font-bold">
                <span>Invoice: {mockInvoice.invoiceNumber}</span>
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>

              {showCustomer && (
                <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                  <div className="font-bold text-slate-800">Patient: {mockInvoice.customerName}</div>
                  <div className="text-slate-500">Ph: {mockInvoice.customerPhone}</div>
                  {showCustomerBalance && (
                    <div className="text-red-600 font-bold font-mono text-[9px] mt-0.5">
                      Previous Due Balance: {formatCurrency(mockInvoice.outstandingBalance)}
                    </div>
                  )}
                </div>
              )}

              {showDoctor && (
                <div className="text-slate-600 text-[9px] flex items-center justify-between">
                  <span>Prescribed by: <b>{mockInvoice.doctorName}</b></span>
                  <span className="font-mono">Reg: {mockInvoice.doctorRegNo}</span>
                </div>
              )}
            </div>

            <div className="py-2">
              <table className="w-full text-left text-[10px]">
                <thead className="border-b border-slate-300 text-slate-600 uppercase text-[9px]">
                  <tr>
                    <th className="py-1">Item Description</th>
                    {showBatch && <th className="py-1">Batch</th>}
                    {showExpiry && <th className="py-1">Exp</th>}
                    <th className="py-1 text-center">Qty</th>
                    {showMrp && <th className="py-1 text-right">MRP</th>}
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockInvoice.items.map((it, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1">
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        {showHsn && <div className="text-[8px] text-slate-400 font-mono">HSN: {it.hsn}</div>}
                      </td>
                      {showBatch && <td className="py-1 font-mono text-[9px] text-slate-600">{it.batch}</td>}
                      {showExpiry && <td className="py-1 font-mono text-[9px] text-slate-500">{it.expiry}</td>}
                      <td className="py-1 text-center font-bold font-mono">{it.qty}</td>
                      {showMrp && <td className="py-1 text-right font-mono text-slate-600">{it.mrp.toFixed(2)}</td>}
                      <td className="py-1 text-right font-bold font-mono text-slate-900">{it.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-300 space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(mockInvoice.subtotal)}</span>
              </div>
              {showDiscount && (
                <div className="flex justify-between text-amber-600">
                  <span>Discount Savings (-)</span>
                  <span className="font-mono">-{formatCurrency(mockInvoice.discountAmount)}</span>
                </div>
              )}
              {showTax && (
                <div className="flex justify-between text-slate-600 text-[9px] font-mono">
                  <span>CGST (6%) + SGST (6%)</span>
                  <span>{formatCurrency(mockInvoice.cgst + mockInvoice.sgst)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1.5 px-2 bg-slate-900 text-white rounded font-bold text-xs mt-1">
                <span>Grand Total:</span>
                <span className="font-mono">{formatCurrency(mockInvoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between text-[9px] text-slate-600 pt-0.5">
                <span>Payment Mode: <b>CASH / UPI</b></span>
                <span>Paid: <b>{formatCurrency(mockInvoice.paidAmount)}</b></span>
              </div>
            </div>

            {(showQr || showBarcode) && (
              <div className="py-3 border-t border-dashed border-slate-200 flex items-center justify-around mt-2">
                {showQr && (
                  <div className="text-center">
                    <div className="w-14 h-14 bg-slate-100 border border-slate-300 p-1 mx-auto rounded flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-slate-800" />
                    </div>
                    <span className="text-[8px] text-slate-500 mt-0.5 block">Scan UPI Pay</span>
                  </div>
                )}
                {showBarcode && (
                  <div className="text-center">
                    <div className="w-24 h-8 bg-slate-100 border border-slate-300 p-1 mx-auto rounded flex items-center justify-center font-mono font-bold text-[9px]">
                      ||| | |||| | |||
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 mt-0.5 block">{mockInvoice.invoiceNumber}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 text-center space-y-1 text-[8px] text-slate-500">
              <p className="font-bold text-slate-800">{thankYouMessage}</p>
              <p className="leading-tight">{returnPolicy}</p>
              {showSignature && (
                <div className="pt-3 flex justify-between text-[9px] text-slate-700">
                  <span>Customer Signature</span>
                  <span>Authorized Pharmacist</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
