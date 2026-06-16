import { Router } from 'express';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import appointmentRoutes from './appointment.routes';
import serviceRoutes from './service.routes';
import staffRoutes from './staff.routes';
import resourceRoutes from './resource.routes';
import notificationRoutes from './notification.routes';
import staffAvailabilityRoutes from './staffAvailability.routes';
import staffLeaveRoutes from './staffLeave.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/businesses', businessRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/services', serviceRoutes);
router.use('/staff', staffRoutes);
router.use('/resources', resourceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/staff-availability', staffAvailabilityRoutes);
router.use('/staff-leave', staffLeaveRoutes);

export default router;
