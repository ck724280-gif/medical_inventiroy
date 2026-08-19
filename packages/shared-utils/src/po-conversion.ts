export interface PurchaseOrderLineItem {
  medicineId: string;
  medicineName?: string;
  orderedQty: number;
  receivedQty?: number;
  unitId?: string;
  expectedRate: number;
  taxPercent: number;
  lineTotal: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  branchId: string;
  status: string;
  items: PurchaseOrderLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export function convertPoToInwardBillPayload(po: PurchaseOrderRecord) {
  return {
    supplierId: po.supplierId,
    branchId: po.branchId,
    notes: `Converted from PO #${po.poNumber}${po.notes ? ' | ' + po.notes : ''}`,
    items: (po.items || []).map((item) => {
      const remainingQty = (item.orderedQty || 0) - (item.receivedQty || 0);
      return {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
        qty: remainingQty > 0 ? remainingQty : item.orderedQty,
        unitId: item.unitId,
        purchasePrice: item.expectedRate,
        mrp: Number((item.expectedRate * 1.25).toFixed(2)),
        sellingPrice: Number((item.expectedRate * 1.2).toFixed(2)),
        taxPercent: item.taxPercent || 0,
        discountPercent: 0,
        lineTotal: item.lineTotal,
      };
    }),
  };
}
