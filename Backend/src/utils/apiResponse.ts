import { Response } from 'express';
import { PaginatedResult } from './pagination';

interface SuccessOptions {
  message?: string;
  statusCode?: number;
}

export function sendSuccess<T>(res: Response, data: T, options: SuccessOptions = {}): void {
  const { message, statusCode = 200 } = options;

  res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
}

export function sendPaginated<T>(
  res: Response,
  collectionKey: string,
  result: PaginatedResult<T>
): void {
  sendSuccess(res, {
    [collectionKey]: result.items,
    pagination: result.meta,
  });
}

export function sendMessage(res: Response, message: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    message,
  });
}
