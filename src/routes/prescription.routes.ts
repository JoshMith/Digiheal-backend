import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireStaffOrAdmin);

// Create new prescription
router.post('/', PrescriptionController.createPrescription);

// Get prescriptions
router.get('/active', PrescriptionController.getActivePrescriptions);
router.get('/expiring', PrescriptionController.getExpiringPrescriptions);
router.get('/stats', PrescriptionController.getPrescriptionStats);
router.get('/patient/:patientId', PrescriptionController.getPatientPrescriptions);
router.get('/staff/:staffId', PrescriptionController.getStaffPrescriptions);
router.get('/:id', PrescriptionController.getPrescriptionById);

// Update prescription
router.put('/:id', PrescriptionController.updatePrescription);

// Prescription actions
router.post('/:id/dispense', PrescriptionController.dispensePrescription);
router.post('/:id/complete', PrescriptionController.completePrescription);
router.post('/:id/cancel', PrescriptionController.cancelPrescription);

export default router;