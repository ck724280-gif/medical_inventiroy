'use client';

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, Share2, X } from 'lucide-react';
import { ThermalReceiptDataDto, PaperWidth } from '@medical-inventory/shared-types';

interface ThermalReceiptPreviewProps {
  data: ThermalReceiptDataDto;
  onClose?: () => void;
}

export function ThermalReceiptPreview({ data, onClose }: ThermalReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${data?.invoiceNumber || 'receipt'}`,
  });

  const is80mm = data?.paperWidth === PaperWidth.WIDTH_80MM;
  const paperWidthClass = is80mm ? 'w-[320px]' : 'w-[260px]';
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm">Thermal Receipt Preview ({data?.paperWidth || '58mm'})</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint()}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            ref={receiptRef}
            className={`${paperWidthClass} bg-white p-4 shadow-lg border border-slate-300 font-mono text-[11px] leading-tight text-black print:m-0 print:p-2 print:shadow-none print:border-none`}
            style={{ fontFamily: '"Courier New", Courier, monospace' }}
          >
            {/* Store Header */}
            <div className="text-center pb-2">
              <h2 className="font-bold text-sm uppercase tracking-wide">{data?.storeName || 'MedCare Pharmacy'}</h2>
              <p className="text-[10px] text-gray-700">{data?.address}</p>
              {data?.phone && <p className="text-[10px] text-gray-700">Ph: {data.phone}</p>}
              {data?.gstNumber && <p className="text-[10px] text-gray-700">GSTIN: {data.gstNumber}</p>}
              {data?.pharmacyLicense && (
                <p className="text-[10px] text-gray-700">D.L.: {data.pharmacyLicense}</p>
              )}
            </div>

            <div className="border-b border-dashed border-black my-1.5" />

            {/* Invoice Meta */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Inv: {data?.invoiceNumber}</span>
                <span>{data?.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Time: {data?.time}</span>
                <span>Staff: {data?.cashierName ? data.cashierName.split(' ')[0] : 'Staff'}</span>
              </div>
              {data?.customerName && data.customerName !== 'Walk-in Customer' && (
                <div className="flex justify-between">
                  <span>Cust: {data.customerName}</span>
                  {data.customerMobile && <span>{data.customerMobile}</span>}
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-black my-1.5" />

            {/* Items Header */}
            <div className="grid grid-cols-12 font-bold text-[10px] pb-1">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amt</div>
            </div>

            <div className="border-b border-dashed border-black mb-1.5" />

            {/* Item Rows */}
            <div className="space-y-1.5 text-[10px]">
              {items.map((item, i) => (
                <div key={i}>
                  <div className="font-bold truncate">{item.name}</div>
                  <div className="grid grid-cols-12 text-gray-800">
                    <div className="col-span-6 text-[9px] text-gray-600">
                      B:{item.batch} Exp:{item.expiry}
                    </div>
                    <div className="col-span-2 text-right">{item.qty}</div>
                    <div className="col-span-2 text-right">{Number(item.rate || 0).toFixed(2)}</div>
                    <div className="col-span-2 text-right font-semibold">{Number(item.amount || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-black my-2" />

            {/* Totals */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(data?.subtotal || 0).toFixed(2)}</span>
              </div>
              {(data?.discountTotal || 0) > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount:</span>
                  <span>-₹{Number(data.discountTotal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Tax/GST:</span>
                <span>₹{Number(data?.taxTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-black">
                <span>TOTAL:</span>
                <span>₹{Number(data?.grandTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700 pt-0.5">
                <span>Paid via:</span>
                <span>{data?.paymentMode || 'CASH'}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-black my-2" />

            {/* Footer */}
            <div className="text-center text-[10px] space-y-1 pt-1">
              <p className="font-bold">{data?.thankYouMessage || 'Thank You! Get Well Soon'}</p>
              {data?.returnPolicy && (
                <p className="text-[8px] text-gray-600 leading-tight">{data.returnPolicy}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
