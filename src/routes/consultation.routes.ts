import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router:Router = Router();

router.use(authenticate);
router.use(requireRole(['STAFF', 'ADMIN']));

router.post('/', ConsultationController.createConsultation);
router.get('/:id', ConsultationController.getConsultationById);
router.get('/patient/:patientId', ConsultationController.getPatientConsultations);

export default router;