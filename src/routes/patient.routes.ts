import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Patient routes
router.post('/', PatientController.createPatient);
router.get('/:id', PatientController.getPatientById);
router.get('/student/:studentId', PatientController.getPatientByStudentId);
router.put('/:id', PatientController.updatePatient);
router.get('/:id/history', PatientController.getPatientMedicalHistory);
router.get('/:id/stats', PatientController.getPatientStats);

// Admin/Staff only routes
router.get('/', requireStaffOrAdmin, PatientController.getAllPatients);

export default router;