import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate, requireRole, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.post('/', AppointmentController.createAppointment);
router.get('/:id', AppointmentController.getAppointmentById);
router.get('/patient/:patientId', AppointmentController.getPatientAppointments);
router.put('/:id', AppointmentController.updateAppointment);
router.post('/:id/check-in', AppointmentController.checkInAppointment);
router.post('/:id/cancel', AppointmentController.cancelAppointment);
router.get('/department/:department/today', requireStaffOrAdmin, AppointmentController.getTodayAppointments);
router.get('/slots/available', AppointmentController.getAvailableSlots);

export default router;