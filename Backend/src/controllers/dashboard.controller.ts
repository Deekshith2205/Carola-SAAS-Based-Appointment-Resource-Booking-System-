import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import type { DashboardBaseQuery } from '../validations/dashboard.validation';
import * as dashboardService from '../services/dashboard.service';

// GET /dashboard
export const getUnifiedDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { businessId } = req.query as unknown as DashboardBaseQuery;
  const result = await dashboardService.getUnifiedDashboard(businessId, req.user!.id, req.user!.role);
  sendSuccess(res, result);
});
