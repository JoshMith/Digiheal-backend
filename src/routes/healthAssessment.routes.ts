import { Router } from 'express';
import { HealthAssessmentController } from '../controllers/healthAssessment.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();
const controller = new HealthAssessmentController();

// All routes require authentication
router.use(authenticate);

// POST /api/health-assessments - Create new assessment
router.post('/', controller.createAssessment);

// GET /api/health-assessments/:id - Get specific assessment
router.get('/:id', controller.getAssessment);

// GET /api/health-assessments/patient/:patientId - Get patient's assessments
router.get('/patient/:patientId', controller.getPatientAssessments);

export default router;