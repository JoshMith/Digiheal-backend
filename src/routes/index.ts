// routes/index.ts

import express from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import staffRoutes from './staff.routes';
import appointmentRoutes from './appointment.routes';
import healthAssessmentRoutes from './healthAssessment.routes';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/staff', staffRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/health-assessments', healthAssessmentRoutes);

export default router;