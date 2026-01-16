import { Router } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import appointmentRoutes from './appointment.routes';
import staffRoutes from './staff.routes';
import dotenv from 'dotenv'
import analyticsRoutes from './analytics.routes';
import interactionRoutes from './interaction.routes';
import prescriptionRoutes from './prescription.routes';

dotenv.config();

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
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/staff', staffRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/interactions', interactionRoutes);
router.use('/prescriptions', prescriptionRoutes);



// TODO: Add more routes as needed
// router.use('/prescriptions', prescriptionRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/queue', queueRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;