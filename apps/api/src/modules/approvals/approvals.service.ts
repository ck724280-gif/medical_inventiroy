import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApprovalRequestDto, ResolveApprovalDto } from './dto/approval.dto';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new approval request (§12) */
  async createRequest(dto: CreateApprovalRequestDto, requestedBy: string) {
    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException('Branch not found.');

    const request = await this.prisma.approvalRequest.create({
      data: {
        branchId: dto.branchId,
        requestedBy,
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        requestedValue: dto.requestedValue,
        reason: dto.reason,
        notes: dto.notes,
        status: 'PENDING',
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requestedBy,
        action: 'APPROVAL_REQUESTED',
        entity: 'ApprovalRequest',
        entityId: request.id,
        newValue: JSON.stringify({ action: dto.action, entityType: dto.entityType }),
      },
    });

    return request;
  }

  /** Resolve an approval request (approve / reject / cancel) (§12) */
  async resolve(id: string, dto: ResolveApprovalDto, resolvedBy: string) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Approval request not found.');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot resolve approval in status '${request.status}'.`);
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: dto.status,
        approvedBy: resolvedBy,
        approvedValue: dto.approvedValue,
        notes: dto.notes,
        resolvedAt: new Date(),
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: resolvedBy,
        action: dto.status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
        entity: 'ApprovalRequest',
        entityId: id,
        newValue: JSON.stringify({ status: dto.status, action: request.action }),
      },
    });

    return updated;
  }

  /** List all approval requests for a branch, with optional status filter (§12) */
  async findAll(branchId?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.approvalRequest.count({ where }),
      this.prisma.approvalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          requester: { select: { id: true, firstName: true, lastName: true } },
          approver: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  /** Find single approval request (§12) */
  async findOne(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        approver: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!request) throw new NotFoundException('Approval request not found.');
    return request;
  }

  /** Get pending approval count for dashboard (§18) */
  async getPendingCount(branchId?: string): Promise<number> {
    return this.prisma.approvalRequest.count({
      where: { status: 'PENDING', ...(branchId ? { branchId } : {}) },
    });
  }
}
