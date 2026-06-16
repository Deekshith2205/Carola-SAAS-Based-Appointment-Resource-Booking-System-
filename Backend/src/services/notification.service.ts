import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { paginateQuery, PaginationParams } from '../utils/pagination';

export async function listNotifications(
  userId: string,
  pagination: PaginationParams,
  unreadOnly = false
) {
  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  return paginateQuery(
    () => prisma.notification.count({ where }),
    (skip, take) =>
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    pagination
  );
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(userId: string, title: string, message: string) {
  return prisma.notification.create({
    data: { userId, title, message },
  });
}
