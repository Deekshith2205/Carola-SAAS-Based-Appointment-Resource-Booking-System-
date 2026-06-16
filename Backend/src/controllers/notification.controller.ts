import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import * as notificationService from '../services/notification.service';
import type { NotificationListQuery } from '../validations/common.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, unreadOnly } = req.query as unknown as NotificationListQuery;
  const pagination = parsePagination(page, limit);

  const result = await notificationService.listNotifications(
    req.user!.id,
    pagination,
    unreadOnly === 'true'
  );

  sendPaginated(res, 'notifications', result);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markNotificationRead(
    req.params.id,
    req.user!.id
  );

  sendSuccess(res, { notification }, { message: 'Notification marked as read' });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllNotificationsRead(req.user!.id);

  sendMessage(res, 'All notifications marked as read');
});
