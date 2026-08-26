'use client';

import React, { useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { ThermalReceiptDataDto, PaperWidth } from '@medical-inventory/shared-types';

interface ThermalReceiptPreviewProps {
  data: ThermalReceiptDataDto;
  onClose?: () => void;
}

type PrintLayout = 'A4' | 'A5' | '80MM' | '58MM';

export function ThermalReceiptPreview({ data, onClose }: ThermalReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const initialLayout: PrintLayout =
    data?.paperWidth === PaperWidth.WIDTH_80MM
      ? '80MM'
      : (data?.paperWidth as any) === 'A4'
      ? 'A4'
      : (data?.paperWidth as any) === 'A5'
      ? 'A5'
      : '58MM';

  const [layout, setLayout] = useState<PrintLayout>(initialLayout);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    let printWidth = '100%';
    let fontSize = '12px';
    let padding = '20px';
    let isDocLayout = false;

    if (layout === 'A4') {
      printWidth = '100%';
      fontSize = '12px';
      padding = '20px';
      isDocLayout = true;
    } else if (layout === 'A5') {
      printWidth = '100%';
      fontSize = '10.5px';
      padding = '12px';
      isDocLayout = true;
    } else if (layout === '80MM') {
      printWidth = '300px';
      fontSize = '11px';
      padding = '10px';
    } else if (layout === '58MM') {
      printWidth = '230px';
      fontSize = '11px';
      padding = '10px';
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const idoc = iframe.contentWindow?.document;
    if (idoc) {
      idoc.open();
      idoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Receipt-${data?.invoiceNumber || 'receipt'}</title>
            <style>
              @page {
                margin: 0;
                size: ${layout === 'A5' ? 'A5' : layout === 'A4' ? 'A4' : 'auto'};
              }
              body {
                margin: 0 auto;
                padding: ${padding};
                width: ${printWidth};
                font-family: ${isDocLayout ? 'Arial, sans-serif' : '"Courier New", Courier, monospace'};
                font-size: ${fontSize};
                line-height: 1.3;
                color: #000000;
                background: #ffffff;
                box-sizing: border-box;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .dashed { border-bottom: 1px dashed #000000; margin: 6px 0; }
              .solid { border-bottom: 1px solid #000000; margin: 6px 0; }
              table { width: 100%; border-collapse: collapse; font-size: inherit; }
              th, td { padding: ${layout === 'A5' ? '2px 2px' : '4px 2px'}; }
              ${
                isDocLayout
                  ? `
                th { border-bottom: 2px solid #000; border-top: 2px solid #000; text-align: left; }
                td { border-bottom: 1px solid #eee; }
                .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
                .store-details h2 { margin: 0 0 4px 0; font-size: ${layout === 'A5' ? '18px' : '22px'}; }
                .meta-details { text-align: right; }
                .totals-section { width: 280px; margin-left: auto; margin-top: 14px; }
                .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
              `
                  : ''
              }
              .nowrap { white-space: nowrap; }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
        </html>
      `);
      idoc.close();

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 500);
    }
  };

  const items = Array.isArray(data?.items) ? data.items : [];
  const isDocLayout = layout === 'A4' || layout === 'A5';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col w-full max-w-4xl max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm">Invoice &amp; Receipt Print Layout</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setLayout('A4')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  layout === 'A4' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setLayout('A5')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  layout === 'A5' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                A5 Half-Page
              </button>
              <button
                onClick={() => setLayout('80MM')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  layout === '80MM' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setLayout('58MM')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  layout === '58MM' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                58mm Thermal
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-900 flex justify-center">
          {isDocLayout ? (
            <div
              ref={receiptRef}
              className={`w-full ${
                layout === 'A5' ? 'max-w-xl p-6 text-xs' : 'max-w-3xl p-8 text-sm'
              } bg-white shadow-lg border border-slate-300 text-black`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {data?.isReprint && (
                <div className="text-center font-bold tracking-widest uppercase mb-4 text-gray-500 text-[11px]">
                  *** DUPLICATE / REPRINT ***
                </div>
              )}

              <div className="invoice-header flex justify-between items-start mb-6">
                <div className="store-details">
                  {data?.logo && (
                    <img src={data.logo} alt={data.storeName || 'Logo'} className="h-10 max-w-[140px] object-contain mb-1.5" />
                  )}
                  <h2 className={`font-bold ${layout === 'A5' ? 'text-xl' : 'text-2xl'} m-0`}>
                    {data?.storeName || 'MedCare Pharmacy'}
                  </h2>
                  <p className="text-gray-600 mt-1">{data?.address}</p>
                  {data?.phone && <p className="text-gray-600">Ph: {data.phone}</p>}
                  {data?.gstNumber && <p className="text-gray-600">GSTIN: {data.gstNumber}</p>}
                  {data?.pharmacyLicense && <p className="text-gray-600">D.L.: {data.pharmacyLicense}</p>}
                </div>
                <div className="meta-details text-right">
                  <h1 className={`${layout === 'A5' ? 'text-2xl' : 'text-3xl'} font-bold text-gray-800 m-0 mb-2`}>
                    TAX INVOICE
                  </h1>
                  <p>
                    <strong>Invoice #:</strong> {data?.invoiceNumber}
                  </p>
                  <p>
                    <strong>Date:</strong> {data?.date} {data?.time}
                  </p>
                  <p>
                    <strong>Cashier:</strong> {data?.cashierName || 'Staff'}
                  </p>
                </div>
              </div>

              {data?.customerName && data.customerName !== 'Walk-in Customer' && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                  <h3 className="font-bold text-gray-800 mb-1">Billed To:</h3>
                  <p className="font-semibold">{data.customerName}</p>
                  {data.customerMobile && <p>Ph: {data.customerMobile}</p>}
                </div>
              )}

              <table className="w-full text-left mb-6 text-xs">
                <thead>
                  <tr>
                    <th className="py-2 px-2 border-y-2 border-black">S.No</th>
                    <th className="py-2 px-2 border-y-2 border-black">Item Description</th>
                    <th className="py-2 px-2 border-y-2 border-black">Batch</th>
                    <th className="py-2 px-2 border-y-2 border-black">Expiry</th>
                    <th className="py-2 px-2 border-y-2 border-black text-center">Qty</th>
                    <th className="py-2 px-2 border-y-2 border-black text-right">Rate</th>
                    <th className="py-2 px-2 border-y-2 border-black text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 border-b border-gray-200">{idx + 1}</td>
                      <td className="py-2 px-2 border-b border-gray-200">
                        <div className="font-bold">{item.name}</div>
                        {item.mrp && <div className="text-[10px] text-gray-500">MRP: ₹{item.mrp}</div>}
                      </td>
                      <td className="py-2 px-2 border-b border-gray-200 text-gray-700">
                        {item.batch || item.batchNumber || '—'}
                      </td>
                      <td className="py-2 px-2 border-b border-gray-200 text-gray-700">
                        {item.expiry || item.expiryDate || '—'}
                      </td>
                      <td className="py-2 px-2 border-b border-gray-200 text-center">
                        {item.qty} {item.unit || ''}
                      </td>
                      <td className="py-2 px-2 border-b border-gray-200 text-right">
                        ₹{Number(item.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border-b border-gray-200 text-right font-bold">
                        ₹{Number(item.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-start">
                <div className="w-1/2 text-xs text-gray-600 pr-4">
                  <p className="font-bold text-gray-800 mb-1">Terms &amp; Conditions:</p>
                  <p>
                    {data?.returnPolicy ||
                      'Goods once sold will not be taken back or exchanged. Keep the invoice for any discrepancies.'}
                  </p>
                  <p className="mt-3 font-semibold text-black">
                    {data?.thankYouMessage || 'Thank You! Get Well Soon.'}
                  </p>
                </div>

                <div className="w-1/2 max-w-sm text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">₹{Number(data?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {Number(data?.discountTotal || 0) > 0 && (
                    <div className="flex justify-between py-1 text-green-700">
                      <span>Discount:</span>
                      <span>-₹{Number(data?.discountTotal || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(data?.taxTotal || 0) > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Tax/GST:</span>
                      <span className="font-semibold">₹{Number(data?.taxTotal || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(() => {
                    const roundOffVal = (data as any)?.roundOff !== undefined 
                      ? Number((data as any).roundOff) 
                      : Number((Number(data?.grandTotal || 0) - (Number(data?.subtotal || 0) - Number(data?.discountTotal || 0) + Number(data?.taxTotal || 0))).toFixed(2));
                    if (roundOffVal === 0) return null;
                    return (
                      <div className="flex justify-between py-1 text-gray-700">
                        <span>Round Off:</span>
                        <span className="font-semibold">{roundOffVal > 0 ? '+' : ''}₹{roundOffVal.toFixed(2)}</span>
                      </div>
                    );
                  })()}

                  <div className="border-t-2 border-black my-2" />

                  <div className="flex justify-between py-1 text-base font-bold">
                    <span>Grand Total:</span>
                    <span>₹{Number(data?.grandTotal || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1 text-xs bg-gray-100 px-2 rounded mt-2">
                    <span className="text-gray-600">Payment Mode:</span>
                    <span className="font-bold">{data?.paymentMode || 'CASH'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-right border-t border-gray-300 pt-2 w-48 ml-auto">
                <p className="text-xs font-semibold text-gray-600 text-center">Authorized Signatory</p>
              </div>
            </div>
          ) : (
            <div
              ref={receiptRef}
              className={`${layout === '80MM' ? 'w-[320px]' : 'w-[260px]'} bg-white p-4 shadow-lg border border-slate-300 text-black`}
              style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '11px', lineHeight: '1.25' }}
            >
              {/* Thermal Render */}
              <div className="text-center pb-2">
                {data?.logo && (
                  <div className="flex justify-center mb-1">
                    <img src={data.logo} alt={data.storeName || 'Logo'} className="h-8 max-w-[100px] object-contain" />
                  </div>
                )}
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
                      <td className="py-1 text-center align-top">
                        {item.qty} {item.unit || ''}
                      </td>
                      <td className="py-1 text-right align-top">₹{Number(item.rate || 0).toFixed(2)}</td>
                      <td className="py-1 text-right align-top font-bold">₹{Number(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-b border-dashed border-black my-1.5" />

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
                {(() => {
                  const roundOffVal = (data as any)?.roundOff !== undefined 
                    ? Number((data as any).roundOff) 
                    : Number((Number(data?.grandTotal || 0) - (Number(data?.subtotal || 0) - Number(data?.discountTotal || 0) + Number(data?.taxTotal || 0))).toFixed(2));
                  if (roundOffVal === 0) return null;
                  return (
                    <div className="flex justify-between text-gray-800">
                      <span>Round Off:</span>
                      <span>{roundOffVal > 0 ? '+' : ''}₹{roundOffVal.toFixed(2)}</span>
                    </div>
                  );
                })()}
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

              <div className="text-center space-y-1 text-[9px] text-gray-600">
                <p className="font-bold text-black text-[10px]">{data?.thankYouMessage || 'Thank You! Get Well Soon'}</p>
                {data?.returnPolicy && <p>{data.returnPolicy}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
