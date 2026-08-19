import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FefoService } from '../inventory/fefo.service';
import { SalesService } from '../sales/sales.service';
import { CheckoutSaleDto } from '../sales/dto/create-sale.dto';

// In-memory or temporary cache for held carts
const heldCartsMap = new Map<string, { id: string; name: string; cart: any; timestamp: Date }>();

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private fefoService: FefoService,
    private salesService: SalesService
  ) {}

  async quickScan(barcode: string, branchId: string) {
    const medicine = await this.prisma.medicine.findFirst({
      where: {
        OR: [
          { barcode },
          { sku: barcode },
          { eanUpcGtin: barcode },
          { barcodes: { some: { barcodeValue: barcode } } },
        ],
        isActive: true,
      },
      include: {
        baseUnit: true,
        category: true,
        batches: {
          where: {
            branchId,
            status: 'ACTIVE',
            expiryDate: { gt: new Date() },
            currentQty: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' }, // FEFO sort
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException(`No medicine found for barcode '${barcode}'`);
    }

    const fefoAllocation = await this.fefoService.allocateBatchesForSale(medicine.id, branchId, 1);

    return {
      medicine: {
        id: medicine.id,
        name: medicine.name,
        genericName: medicine.genericName,
        sku: medicine.sku,
        mrp: medicine.mrp,
        defaultSellingPrice: medicine.defaultSellingPrice,
        taxPercent: medicine.taxPercent,
        baseUnit: medicine.baseUnit.abbreviation,
        prescriptionRequired: medicine.prescriptionRequired,
      },
      fefoBatch: fefoAllocation.allocations[0] || null,
      availableStock: medicine.batches.reduce((sum, b) => sum + b.currentQty, 0),
      batches: medicine.batches,
    };
  }

  async holdCart(data: { name?: string; cart: any }) {
    const id = `HELD-${Date.now().toString(36).toUpperCase()}`;
    const name = data.name || `Cart held at ${new Date().toLocaleTimeString()}`;
    const record = { id, name, cart: data.cart, timestamp: new Date() };
    heldCartsMap.set(id, record);
    return record;
  }

  async listHeldCarts() {
    return Array.from(heldCartsMap.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async resumeCart(id: string) {
    const held = heldCartsMap.get(id);
    if (!held) {
      throw new NotFoundException(`Held cart with ID ${id} not found`);
    }
    heldCartsMap.delete(id);
    return held;
  }

  async deleteHeldCart(id: string) {
    heldCartsMap.delete(id);
    return { success: true };
  }

  async checkout(dto: CheckoutSaleDto, userId: string) {
    return this.salesService.checkout(dto, userId);
  }
}
