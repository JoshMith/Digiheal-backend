import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

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
router.get('/', requireRole('STAFF', 'ADMIN'), PatientController.getAllPatients);

export default router;