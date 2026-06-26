import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import * as appointmentService from '../services/appointment.service';
import type { AppointmentListQuery } from '../validations/common.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.createAppointment(req.user!.id, req.body);

  req.auditLog = { action: 'APPOINTMENT_CREATION', entity: 'Appointment', entityId: appointment.id };

  sendSuccess(res, { appointment }, {
    message: 'Appointment booked successfully',
    statusCode: 201,
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, businessId } = req.query as unknown as AppointmentListQuery;
  const pagination = parsePagination(page, limit);

  const result = await appointmentService.listAppointments(
    req.user!.id,
    req.user!.role,
    pagination,
    businessId
  );

  sendPaginated(res, 'appointments', result);
});

export const getSlots = asyncHandler(async (req: Request, res: Response) => {
  const { businessId, serviceId, date, staffId } = req.query as any;
  const slots = await appointmentService.getAvailableTimeSlots(businessId, serviceId, date, staffId);
  sendSuccess(res, { slots }, { message: 'Available slots fetched successfully' });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.getAppointmentById(
    req.params.id,
    req.user!.id,
    req.user!.role
  );

  sendSuccess(res, { appointment });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.updateAppointment(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );

  req.auditLog = { action: 'APPOINTMENT_UPDATE', entity: 'Appointment', entityId: appointment.id };

  sendSuccess(res, { appointment }, { message: 'Appointment updated successfully' });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.updateAppointmentStatus(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );

  req.auditLog = {
    action: 'APPOINTMENT_UPDATE',
    entity: 'Appointment',
    entityId: appointment.id,
    details: {
      action: 'UPDATE_APPOINTMENT_STATUS',
      newStatus: appointment.status,
    },
  };

  sendSuccess(res, { appointment }, { message: `Appointment status updated to ${appointment.status}` });
});


export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.cancelAppointment(
    req.params.id,
    req.user!.id,
    req.user!.role
  );

  req.auditLog = { action: 'APPOINTMENT_CANCELLATION', entity: 'Appointment', entityId: appointment.id };

  sendSuccess(res, { appointment }, { message: 'Appointment cancelled successfully' });
});
