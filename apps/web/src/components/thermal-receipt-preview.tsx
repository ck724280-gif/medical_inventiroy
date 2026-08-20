'use client';

import React, { useRef } from 'react';
import { Printer, Download, Share2, X } from 'lucide-react';
import { ThermalReceiptDataDto, PaperWidth } from '@medical-inventory/shared-types';

interface ThermalReceiptPreviewProps {
  data: ThermalReceiptDataDto;
  onClose?: () => void;
}

export function ThermalReceiptPreview({ data, onClose }: ThermalReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) {
      window.print();
      return;
    }

    const is80 = data?.paperWidth === PaperWidth.WIDTH_80MM || (data?.paperWidth as any) === '80mm';
    const printWidth = is80 ? '300px' : '230px';

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt-${data?.invoiceNumber || 'receipt'}</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body {
              margin: 0 auto;
              padding: 10px;
              width: ${printWidth};
              font-family: "Courier New", Courier, monospace;
              font-size: 11px;
              line-height: 1.25;
              color: #000000;
              background: #ffffff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .dashed { border-bottom: 1px dashed #000000; margin: 6px 0; }
            .solid { border-bottom: 1px solid #000000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th, td { padding: 2px 0; }
            .nowrap { white-space: nowrap; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.close();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const is80mm = data?.paperWidth === PaperWidth.WIDTH_80MM || (data?.paperWidth as any) === '80mm';
  const paperWidthClass = is80mm ? 'w-[320px]' : 'w-[260px]';
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm">Thermal Receipt Preview ({is80mm ? '80mm' : '58mm'})</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900 flex justify-center">
          <div
            ref={receiptRef}
            className={`${paperWidthClass} bg-white p-4 shadow-lg border border-slate-300 font-mono text-[11px] leading-tight text-black`}
            style={{ fontFamily: '"Courier New", Courier, monospace' }}
          >
            {/* Store Header */}
            <div className="text-center pb-2">
              {data?.isReprint && (
                <div className="border border-black py-0.5 mb-1.5 font-bold text-[10px] tracking-widest uppercase">
                  *** DUPLICATE / REPRINT ***
                </div>
              )}
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

            {/* Items Table */}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black text-[10px] font-bold">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-1">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-[9px] text-gray-600">
                        {item.batch || item.batchNumber ? `B:${item.batch || item.batchNumber}` : ''}
                        {item.expiry || item.expiryDate ? ` E:${item.expiry || item.expiryDate}` : ''}
                        {item.mrp ? ` MRP:₹${item.mrp}` : ''}
                      </div>
                    </td>
                    <td className="py-1 text-center align-top">{item.qty} {item.unit || ''}</td>
                    <td className="py-1 text-right align-top">₹{Number(item.rate || 0).toFixed(2)}</td>
                    <td className="py-1 text-right align-top font-bold">₹{Number(item.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-black my-1.5" />

            {/* Totals */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(data?.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(data?.discountTotal || 0) > 0 && (
                <div className="flex justify-between text-gray-800">
                  <span>Discount:</span>
                  <span>-₹{Number(data?.discountTotal || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(data?.taxTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Tax/GST:</span>
                  <span>₹{Number(data?.taxTotal || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-black my-1" />
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>₹{Number(data?.grandTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Paid via:</span>
                <span className="font-bold uppercase">{data?.paymentMode || 'CASH'}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-black my-2" />

            {/* Footer */}
            <div className="text-center space-y-1 text-[9px] text-gray-600">
              <p className="font-bold text-black text-[10px]">{data?.thankYouMessage || 'Thank You! Get Well Soon'}</p>
              {data?.returnPolicy && <p>{data.returnPolicy}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
