import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.get('/slots', AppointmentController.getAvailableSlots);
router.post('/predict-duration', AppointmentController.predictAppointmentDuration);

// ============================================
// PROTECTED ROUTES (Authentication required)
// Apply authenticate middleware to all routes below
// ============================================
router.use(authenticate);

// Create appointment
router.post('/', AppointmentController.createAppointment);

router.get('/stats', AppointmentController.getAppointmentStats);
router.get('/today/:department', AppointmentController.getTodayAppointments);
router.get('/patient/:patientId', AppointmentController.getPatientAppointments);
router.get('/staff/:staffId', AppointmentController.getStaffAppointments);
// Dynamic ID route - MUST come AFTER specific routes
router.get('/:id', AppointmentController.getAppointmentById);
router.put('/:id', AppointmentController.updateAppointment);
router.put('/:id/checkin', AppointmentController.checkInAppointment);
router.put('/:id/start', AppointmentController.startAppointment);
router.put('/:id/complete', AppointmentController.completeAppointment);
router.delete('/:id/cancel', AppointmentController.cancelAppointment);

export default router;