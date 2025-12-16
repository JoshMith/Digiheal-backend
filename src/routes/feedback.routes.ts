// src/routes/feedback.routes.ts
// Objective 5: Feedback routes for ratings and trend analysis

import { Router } from 'express';
import {
  createFeedback,
  getFeedbackById,
  getAllFeedback,
  getFeedbackAnalytics,
  respondToFeedback,
  getMyFeedback,
  deleteFeedback,
} from '../controllers/feedback.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createFeedbackSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    rating: z.number().min(1).max(5),
    category: z.enum([
      'SERVICE',
      'STAFF',
      'FACILITY',
      'APPOINTMENT',
      'VIRTUAL_CONSULTATION',
      'TRIAGE_ACCURACY',
      'WAIT_TIME',
      'COMMUNICATION',
      'OTHER',
    ]),
    comments: z.string().max(1000).optional(),
    isAnonymous: z.boolean().optional(),
  }),
});

const respondSchema = z.object({
  body: z.object({
    responseText: z.string().min(1).max(500),
  }),
});

// Patient routes
router.post(
  '/',
  authenticate,
  authorize(['PATIENT']),
  validate(createFeedbackSchema),
  createFeedback
);

router.get(
  '/my-feedback',
  authenticate,
  authorize(['PATIENT']),
  getMyFeedback
);

// Staff/Admin routes
router.get(
  '/',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  getAllFeedback
);

router.get(
  '/analytics',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  getFeedbackAnalytics
);

router.get(
  '/:id',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  getFeedbackById
);

router.post(
  '/:id/respond',
  authenticate,
  authorize(['STAFF', 'ADMIN']),
  validate(respondSchema),
  respondToFeedback
);

// Admin only
router.delete(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  deleteFeedback
);

export default router;