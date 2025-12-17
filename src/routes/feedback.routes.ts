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
import { authenticate, requireAdmin, requirePatient, requireStaffOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { FeedbackCategory } from '@prisma/client';

const router = Router();

// Validation schemas
const createFeedbackSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    rating: z.number().min(1).max(5),
    category: z.nativeEnum(FeedbackCategory),
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
  requirePatient,
  validate(createFeedbackSchema),
  createFeedback
);

router.get(
  '/my-feedback',
  authenticate,
  requirePatient,
  getMyFeedback
);

// Staff/Admin routes
router.get(
  '/',
  authenticate,
  requireStaffOrAdmin,
  getAllFeedback
);

router.get(
  '/analytics',
  authenticate,
  requireStaffOrAdmin,
  getFeedbackAnalytics
);

router.get(
  '/:id',
  authenticate,
  requireStaffOrAdmin,
  getFeedbackById
);

router.post(
  '/:id/respond',
  authenticate,
  requireStaffOrAdmin,
  validate(respondSchema),
  respondToFeedback
);

// Admin only
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  deleteFeedback
);

export default router;