'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Printer,
  Building2,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Share2,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import axios from 'axios';

export default function PublicReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const autoPrint = searchParams?.get('print') === 'true' || searchParams?.get('autoPrint') === 'true';

  const [receipt, setReceipt] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://medical-inventiroy.onrender.com';
    axios
      .get(`${apiUrl}/sales/public/${id}`)
      .then((res) => {
        const data = res.data?.data || res.data;
        setReceipt(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Invoice not found or invalid link.');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (autoPrint && receipt && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [autoPrint, receipt, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center space-y-3 max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Digital Receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center space-y-4 max-w-md w-full border border-red-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Receipt Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Unable to retrieve invoice details.'}</p>
        </div>
      </div>
    );
  }

  const paidAmount = (receipt.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const grandTotal = Number(receipt.grandTotal || 0);
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const isPaid = balanceDue === 0;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 font-sans text-slate-900 print:bg-white print:p-0">
      {/* Top Action Bar (hidden when printing) */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Verified Digital Tax Receipt
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Printable Receipt Card */}
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-0 print:max-w-none print:rounded-none">
        {/* Store Header */}
        <div className="text-center border-b-2 border-sky-600 pb-5 space-y-1.5">
          <h1 className="text-2xl font-black text-sky-700 tracking-tight uppercase">
            {receipt.storeName || 'MedCare Pharmacy'}
          </h1>
          <p className="text-xs text-slate-600 font-medium">{receipt.address}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
            {receipt.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> {receipt.phone}
              </span>
            )}
            {receipt.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" /> {receipt.email}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 text-[11px] font-mono text-slate-600 pt-1">
            <span><strong>GSTIN:</strong> {receipt.gstNumber || 'N/A'}</span>
            <span>|</span>
            <span><strong>DL No:</strong> {receipt.pharmacyLicense || 'N/A'}</span>
          </div>
        </div>

        {/* Invoice & Customer Meta */}
        <div className="grid grid-cols-2 gap-4 text-xs border-b border-dashed border-slate-300 pb-4">
          <div className="space-y-1">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Invoice Details</p>
            <p className="font-bold font-mono text-sky-700 text-sm">#{receipt.invoiceNumber}</p>
            <p className="text-slate-600"><strong>Date:</strong> {receipt.date} {receipt.time}</p>
            <p className="text-slate-600"><strong>Cashier:</strong> {receipt.cashierName}</p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Billed To</p>
            <p className="font-bold text-slate-900 text-sm">{receipt.customerName || 'Walk-in Customer'}</p>
            {receipt.customerMobile && (
              <p className="text-slate-600 font-mono"><strong>Mob:</strong> {receipt.customerMobile}</p>
            )}
            <div className="pt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-red-600" />}
                {isPaid ? 'PAID IN FULL' : `DUE: ₹${balanceDue.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Outstanding Payment Reminder (if not paid in full) */}
        {!isPaid && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1.5 print:bg-slate-50">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Payment Outstanding Notice
            </div>
            <p className="text-amber-800 text-[11px]">
              An outstanding balance of <strong className="font-mono text-base text-red-600 font-black">₹{balanceDue.toFixed(2)}</strong> is remaining on this invoice.
              Kindly clear the balance via UPI, Cash, or at the pharmacy counter.
            </p>
          </div>
        )}

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Medicine / Item</th>
                <th className="py-2.5 px-2 font-mono">Batch</th>
                <th className="py-2.5 px-2 font-mono">Exp</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(receipt.items || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{item.batch || '—'}</td>
                  <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{item.expiry || '—'}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-800">{item.qty} {item.unit}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{Number(item.rate).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Financial Breakdown */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <div className="w-full sm:w-72 space-y-1.5 text-xs font-medium">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{Number(receipt.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(receipt.discountTotal || 0) > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-₹{Number(receipt.discountTotal).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST Tax Amount:</span>
              <span className="font-mono">₹{Number(receipt.taxTotal || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-slate-900 border-y-2 border-slate-900 py-2 my-1.5">
              <span>Grand Total:</span>
              <span className="font-mono text-sky-700">₹{grandTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Amount Paid:</span>
              <span className="font-mono">₹{paidAmount.toFixed(2)}</span>
            </div>

            {balanceDue > 0 && (
              <div className="flex justify-between text-red-600 font-black text-sm bg-red-50 p-2 rounded-xl border border-red-200">
                <span>Balance Due:</span>
                <span className="font-mono">₹{balanceDue.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-1 text-[10px] text-slate-500 text-right">
              Mode: <strong>{receipt.paymentMode || 'CASH'}</strong>
            </div>
          </div>
        </div>

        {/* Footer Notes & Policy */}
        <div className="border-t border-dashed border-slate-300 pt-5 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-800 text-sm">{receipt.thankYouMessage || 'Thank You! Get Well Soon.'}</p>
          <p className="text-[11px]">{receipt.returnPolicy || 'Goods once sold can only be returned within 7 days with original invoice.'}</p>
          <p className="text-[10px] text-slate-400 pt-2 font-mono">This is a computer generated electronic receipt.</p>
        </div>
      </div>
    </div>
  );
}