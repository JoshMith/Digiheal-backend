// src/routes/patient.routes.ts
import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

router.use(authenticate);

// ADD THESE MISSING ROUTES:
router.get('/:id/vitals', PatientController.getPatientVitalSigns);
router.post('/:id/vitals', PatientController.addVitalSigns);
router.get('/:id/appointments', PatientController.getPatientAppointments); // MISSING
router.get('/:id/prescriptions', PatientController.getPatientPrescriptions); // MISSING  
router.get('/:id/medical-history', PatientController.getPatientMedicalHistory); // EXISTS but check route
router.get('/:id/stats', PatientController.getPatientStats);

// Other routes...
router.post('/', PatientController.createPatient);
router.get('/:id', PatientController.getPatientById);
router.get('/student/:studentId', PatientController.getPatientByStudentId);
router.put('/:id', PatientController.updatePatient);
router.get('/:id/history', PatientController.getPatientMedicalHistory);

// Staff/Admin only
router.get('/', requireStaffOrAdmin, PatientController.getAllPatients);

export default router;