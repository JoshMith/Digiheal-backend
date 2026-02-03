import { Router } from 'express';
import { InteractionController } from '../controllers/interaction.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Time tracking endpoints
router.post('/start', InteractionController.startInteraction);
router.post('/:id/vitals-start', InteractionController.startVitals);
router.post('/:id/vitals-end', InteractionController.endVitals);
router.post('/:id/consultation-start', InteractionController.startConsultation);
router.post('/:id/consultation-end', InteractionController.endConsultation);
router.post('/:id/checkout', InteractionController.checkout);

// Get interactions
router.get('/queue', InteractionController.getQueue);
router.get('/active', InteractionController.getActiveInteractions);
router.get('/stats', InteractionController.getStats);
router.get('/export', InteractionController.exportTrainingData);
router.get('/patient/:patientId', InteractionController.getPatientInteractions);
router.get('/staff/:staffId', InteractionController.getStaffInteractions);
router.get('/:id', InteractionController.getInteraction);

export default router;