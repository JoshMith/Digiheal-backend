import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();


// Public routes
router.get('/slots', AppointmentController.getAvailableSlots);

// Protected routes
router.use(authenticate);

router.post('/', AppointmentController.createAppointment);
router.get('/patient/:patientId', AppointmentController.getPatientAppointments);
router.get('/staff/:staffId', AppointmentController.getStaffAppointments);
router.get('/today/:department', AppointmentController.getTodayAppointments);
router.get('/stats', AppointmentController.getAppointmentStats);
router.get('/:id', AppointmentController.getAppointmentById);
router.put('/:id', AppointmentController.updateAppointment);
router.put('/:id/checkin', AppointmentController.checkInAppointment);
router.put('/:id/start', AppointmentController.startAppointment);
router.put('/:id/complete', AppointmentController.completeAppointment);
router.delete('/:id/cancel', AppointmentController.cancelAppointment);

export default router;