import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', AppointmentController.createAppointment);
router.get('/:id', AppointmentController.getAppointmentById);
router.get('/patient/:patientId', AppointmentController.getPatientAppointments);
router.put('/:id', AppointmentController.updateAppointment);
router.post('/:id/check-in', AppointmentController.checkInAppointment);
router.post('/:id/cancel', AppointmentController.cancelAppointment);
router.get('/department/:department/today', requireRole(['STAFF', 'ADMIN']), AppointmentController.getTodayAppointments);
router.get('/slots/available', AppointmentController.getAvailableSlots);

export default router;