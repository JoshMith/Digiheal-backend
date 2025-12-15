// routes/healthAssessment.routes.ts

import express, { Router } from 'express';
import { z } from 'zod';
import { HealthAssessmentController } from '../controllers/healthAssessment.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router: Router = express.Router();
const controller = new HealthAssessmentController();

// All routes require authentication
router.use(authenticate);

// POST /api/health-assessments - Create new assessment
router.post('/', validateRequest({
  body: z.object({
	// Add your assessment body schema fields here
  }),
}), controller.createAssessment);

// GET /api/health-assessments/:id - Get specific assessment
router.get('/:id', controller.getAssessment);

// GET /api/health-assessments/patient/:patientId - Get patient's assessments
router.get('/patient/:patientId', controller.getPatientAssessments);

export default router;