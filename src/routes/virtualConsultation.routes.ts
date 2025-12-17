// src/routes/virtualConsultation.routes.ts
// Objective 1: Virtual Consultation routes

import { Router } from 'express';
import {
  createVirtualSession,
  getVirtualSession,
  getSessionByAppointment,
  patientJoinSession,
  staffJoinSession,
  endSession,
  getPatientSessions,
  getStaffSessions,
  updateSessionStatus,
  cancelSession,
} from '../controllers/virtualConsultation.controller';
import { authenticate, authorize, requirePatient, requireStaffOrAdmin } from '../middleware/auth';
// import { validate } from '../middleware/validate';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
  }),
});

const endSessionSchema = z.object({
  body: z.object({
    sessionNotes: z.string().max(2000).optional(),
    connectionQuality: z.enum(['good', 'fair', 'poor']).optional(),
    technicalIssues: z.string().max(500).optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(AppointmentStatus),
    technicalIssues: z.string().max(500).optional(),
  }),
});

const cancelSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

// Staff routes - Create and manage sessions
router.post(
  '/',
  authenticate,
  requireStaffOrAdmin,
  validate(createSessionSchema),
  createVirtualSession
);

router.get(
  '/staff/upcoming',
  authenticate,
  requireStaffOrAdmin,
  getStaffSessions
);

router.post(
  '/:id/staff-join',
  authenticate,
  requireStaffOrAdmin,
  staffJoinSession
);

router.post(
  '/:id/end',
  authenticate,
  requireStaffOrAdmin,
  validate(endSessionSchema),
  endSession
);

router.patch(
  '/:id/status',
  authenticate,
  requireStaffOrAdmin,
  validate(updateStatusSchema),
  updateSessionStatus
);

// Patient routes
router.get(
  '/patient/upcoming',
  authenticate,
  requirePatient,
  getPatientSessions
);

router.post(
  '/:id/patient-join',
  authenticate,
  requirePatient,
  patientJoinSession
);

// Shared routes
router.get(
  '/:id',
  authenticate,
  getVirtualSession
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  getSessionByAppointment
);

router.post(
  '/:id/cancel',
  authenticate,
  validate(cancelSchema),
  cancelSession
);

export default router;