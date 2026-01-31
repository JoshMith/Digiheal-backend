import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', AnalyticsController.getDashboard);
router.get('/patient-flow', AnalyticsController.getPatientFlow);
router.get('/wait-times', AnalyticsController.getWaitTimes);
router.get('/department-load', AnalyticsController.getDepartmentLoad);
router.get('/staff-performance', AnalyticsController.getStaffPerformance);
router.get('/prediction-accuracy', AnalyticsController.getPredictionAccuracy);

export default router;