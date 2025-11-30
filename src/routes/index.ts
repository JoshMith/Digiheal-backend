import { Router } from 'express';
import authRoutes from './auth.routes';
import healthAssessmentRoutes from './healthAssessment.routes';
import patientRoutes from './patient.routes';
import appointmentRoutes from './appointment.routes';
import staffRoutes from './staff.routes';
import consultationRoutes from './consultation.routes';

const router: Router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DKUT Medical Center API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/health-assessments', healthAssessmentRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/staff', staffRoutes);
router.use('/consultations', consultationRoutes);

// TODO: Add more routes as needed
// router.use('/prescriptions', prescriptionRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/queue', queueRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;