import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import type {
  DashboardBaseQuery,
  DateRangeQuery,
  PopularServicesQuery,
  RevenueTrendQuery,
} from '../validations/dashboard.validation';
import * as dashboardService from '../services/dashboard.service';

// GET /dashboard/summary
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { businessId } = req.query as unknown as DashboardBaseQuery;
  const result = await dashboardService.getBookingSummary(businessId, req.user!.id, req.user!.role);
  sendSuccess(res, result);
});

// GET /dashboard/revenue-trends
export const getRevenueTrends = asyncHandler(async (req: Request, res: Response) => {
  const { businessId, startDate, endDate, groupBy } = req.query as unknown as RevenueTrendQuery;
  const result = await dashboardService.getRevenueTrends(
    businessId,
    req.user!.id,
    req.user!.role,
    startDate,
    endDate,
    groupBy
  );
  sendSuccess(res, { trends: result });
});

// GET /dashboard/staff-utilization
export const getStaffUtilization = asyncHandler(async (req: Request, res: Response) => {
  const { businessId, startDate, endDate } = req.query as unknown as DateRangeQuery;
  const result = await dashboardService.getStaffUtilization(
    businessId,
    req.user!.id,
    req.user!.role,
    startDate,
    endDate
  );
  sendSuccess(res, { utilization: result });
});

// GET /dashboard/popular-services
export const getPopularServices = asyncHandler(async (req: Request, res: Response) => {
  const { businessId, limit } = req.query as unknown as PopularServicesQuery;
  const result = await dashboardService.getPopularServices(
    businessId,
    req.user!.id,
    req.user!.role,
    limit
  );
  sendSuccess(res, { popularServices: result });
});

// GET /dashboard/status-distribution
export const getStatusDistribution = asyncHandler(async (req: Request, res: Response) => {
  const { businessId, startDate, endDate } = req.query as unknown as DateRangeQuery;
  const result = await dashboardService.getAppointmentStatusDistribution(
    businessId,
    req.user!.id,
    req.user!.role,
    startDate,
    endDate
  );
  sendSuccess(res, { statusDistribution: result });
});

