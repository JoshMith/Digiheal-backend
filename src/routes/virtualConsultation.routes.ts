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
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

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
    status: z.enum([
      'SCHEDULED',
      'WAITING_ROOM',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'TECHNICAL_FAILURE',
      'NO_SHOW',
    ]),
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
  authorize(['STAFF', 'ADMIN']),
  validate(createSessionSchema),
  createVirtualSession
);

router.get(
  '/staff/upcoming',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  getStaffSessions
);

router.post(
  '/:id/staff-join',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  staffJoinSession
);

router.post(
  '/:id/end',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  validate(endSessionSchema),
  endSession
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  validate(updateStatusSchema),
  updateSessionStatus
);

// Patient routes
router.get(
  '/patient/upcoming',
  authenticate,
  authorize(['PATIENT']),
  getPatientSessions
);

router.post(
  '/:id/patient-join',
  authenticate,
  authorize(['PATIENT']),
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