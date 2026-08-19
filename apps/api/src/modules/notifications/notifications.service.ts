import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@medical-inventory/shared-types';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || null,
      },
    });
  }

  async broadcastToAdmins(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any
  ) {
    const adminRoles = await this.prisma.userRole.findMany({
      where: {
        role: {
          name: { in: ['OWNER', 'ADMIN', 'MANAGER'] },
        },
      },
      select: { userId: true },
    });

    const userIds = Array.from(new Set(adminRoles.map((r) => r.userId)));

    if (userIds.length > 0) {
      await this.prisma.notification.createMany({
        data: userIds.map((uid) => ({
          userId: uid,
          type,
          title,
          message,
          metadata: metadata || null,
        })),
      });
    }
  }
}
