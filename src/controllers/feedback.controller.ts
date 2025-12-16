// src/controllers/feedback.controller.ts
// Objective 5: Feedback dashboard for anonymous ratings and trend analysis

import { Request, Response } from 'express';
import prisma from '../config/database';
import asyncHandler from '../middleware/asyncHandler';
import { FeedbackCategory, Priority } from '@prisma/client';

// ==========================================
// CREATE FEEDBACK
// ==========================================
export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  const {
    appointmentId,
    staffId,
    rating,
    category,
    comments,
    isAnonymous = false,
  } = req.body;

  const patientId = (req.user as any)?.patientId;

  if (!patientId) {
    return res.status(403).json({
      success: false,
      message: 'Only patients can submit feedback',
    });
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5',
    });
  }

  // If appointmentId provided, check it belongs to patient
  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId,
        status: 'COMPLETED',
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or not completed',
      });
    }

    // Check if feedback already exists for this appointment
    const existingFeedback = await prisma.feedback.findUnique({
      where: { appointmentId },
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this appointment',
      });
    }
  }

  // Simple sentiment analysis based on rating and keywords
  const sentimentScore = calculateSentiment(rating, comments);
  const keywords = extractKeywords(comments);

  const feedback = await prisma.feedback.create({
    data: {
      patientId,
      appointmentId: appointmentId ?? null,
      staffId: staffId ?? null,
      rating,
      category: category as FeedbackCategory,
      comments: comments ?? null,
      isAnonymous,
      sentimentScore,
      keywords,
    },
    include: {
      appointment: {
        select: {
          appointmentDate: true,
          department: true,
        },
      },
      staff: isAnonymous ? false : {
        select: {
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
  });

  // Create follow-up notification if rating is low
  if (rating <= 2) {
    await prisma.feedback.update({
      where: { id: feedback.id },
      data: { isFlagged: true },
    });

    // Notify admin about low rating
    await prisma.auditLog.create({
      data: {
        action: 'LOW_RATING_FEEDBACK',
        entity: 'Feedback',
        entityId: feedback.id,
        severity: 'WARNING',
        description: `Low rating (${rating}/5) feedback received${staffId ? ` for staff ${staffId}` : ''}`,
      },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: feedback,
  });
});

// ==========================================
// GET FEEDBACK BY ID
// ==========================================
export const getFeedbackById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      appointment: {
        select: {
          appointmentDate: true,
          department: true,
          appointmentType: true,
        },
      },
      staff: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found',
    });
  }

  // Hide patient info if anonymous
  if (feedback.isAnonymous) {
    feedback.patient = null as any;
  }

  res.json({
    success: true,
    data: feedback,
  });
});

// ==========================================
// GET ALL FEEDBACK (ADMIN/STAFF)
// ==========================================
export const getAllFeedback = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '10',
    category,
    staffId,
    minRating,
    maxRating,
    isFlagged,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (category) where.category = category;
  if (staffId) where.staffId = staffId;
  if (isFlagged === 'true') where.isFlagged = true;

  if (minRating || maxRating) {
    where.rating = {};
    if (minRating) where.rating.gte = parseInt(minRating as string);
    if (maxRating) where.rating.lte = parseInt(maxRating as string);
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy as string]: sortOrder },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
          },
        },
        appointment: {
          select: {
            appointmentDate: true,
            department: true,
          },
        },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  // Hide patient info for anonymous feedbacks
  const processedFeedbacks = feedbacks.map((f) => ({
    ...f,
    patient: f.isAnonymous ? null : f.patient,
  }));

  res.json({
    success: true,
    data: {
      feedbacks: processedFeedbacks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ==========================================
// GET FEEDBACK ANALYTICS (Objective 5: Trend Analysis)
// ==========================================
export const getFeedbackAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, staffId, department } = req.query;

  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  if (staffId) where.staffId = staffId;
  if (department) {
    where.staff = { department };
  }

  // Overall statistics
  const [
    totalFeedbacks,
    averageRating,
    ratingDistribution,
    categoryDistribution,
    trendsOverTime,
    topKeywords,
    flaggedCount,
    sentimentBreakdown,
  ] = await Promise.all([
    // Total feedbacks
    prisma.feedback.count({ where }),

    // Average rating
    prisma.feedback.aggregate({
      where,
      _avg: { rating: true },
    }),

    // Rating distribution
    prisma.feedback.groupBy({
      by: ['rating'],
      where,
      _count: true,
      orderBy: { rating: 'asc' },
    }),

    // Category distribution
    prisma.feedback.groupBy({
      by: ['category'],
      where,
      _count: true,
      _avg: { rating: true },
    }),

    // Trends over time (last 30 days)
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as count,
        AVG(rating)::float as avg_rating
      FROM feedbacks
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `,

    // Top keywords
    prisma.$queryRaw`
      SELECT 
        unnest(keywords) as keyword,
        COUNT(*)::int as count
      FROM feedbacks
      WHERE array_length(keywords, 1) > 0
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
      GROUP BY keyword
      ORDER BY count DESC
      LIMIT 10
    `,

    // Flagged count
    prisma.feedback.count({
      where: { ...where, isFlagged: true },
    }),

    // Sentiment breakdown
    prisma.feedback.aggregate({
      where: { ...where, sentimentScore: { not: null } },
      _avg: { sentimentScore: true },
      _count: true,
    }),
  ]);

  // Staff performance rankings
  const staffPerformance = await prisma.feedback.groupBy({
    by: ['staffId'],
    where: { ...where, staffId: { not: null } },
    _avg: { rating: true },
    _count: true,
    orderBy: { _avg: { rating: 'desc' } },
    take: 10,
  });

  // Get staff details for the rankings
  const staffIds = staffPerformance
    .filter((s) => s.staffId)
    .map((s) => s.staffId as string);

  const staffDetails = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
    },
  });

  const staffMap = new Map(staffDetails.map((s) => [s.id, s]));

  const staffRankings = staffPerformance
    .filter((s) => s.staffId && staffMap.has(s.staffId))
    .map((s) => ({
      staff: staffMap.get(s.staffId!),
      averageRating: s._avg.rating,
      feedbackCount: s._count,
    }));

  res.json({
    success: true,
    data: {
      summary: {
        totalFeedbacks,
        averageRating: averageRating._avg.rating?.toFixed(2) || '0',
        flaggedCount,
        averageSentiment: sentimentBreakdown._avg?.sentimentScore?.toFixed(2) || '0',
      },
      ratingDistribution: ratingDistribution.map((r) => ({
        rating: r.rating,
        count: r._count,
        percentage: ((r._count / totalFeedbacks) * 100).toFixed(1),
      })),
      categoryDistribution: categoryDistribution.map((c) => ({
        category: c.category,
        count: c._count,
        averageRating: c._avg.rating?.toFixed(2),
      })),
      trends: trendsOverTime,
      topKeywords,
      staffRankings,
    },
  });
});

// ==========================================
// RESPOND TO FEEDBACK (ADMIN/STAFF)
// ==========================================
export const respondToFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { responseText } = req.body;
  const staffId = (req.user as any)?.staffId || (req.user as any)?.id;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found',
    });
  }

  const updatedFeedback = await prisma.feedback.update({
    where: { id },
    data: {
      respondedAt: new Date(),
      responseBy: staffId,
      responseText,
      isFlagged: false, // Unflag after response
    },
  });

  // Notify patient about response (if not anonymous)
  if (!feedback.isAnonymous) {
    await prisma.notification.create({
      data: {
        patientId: feedback.patientId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Response to Your Feedback',
        message: 'The medical center has responded to your feedback. Thank you for helping us improve.',
        priority: 'NORMAL',
        channel: 'IN_APP',
      },
    });
  }

  res.json({
    success: true,
    message: 'Response submitted successfully',
    data: updatedFeedback,
  });
});

// ==========================================
// GET PATIENT'S OWN FEEDBACK
// ==========================================
export const getMyFeedback = asyncHandler(async (req: Request, res: Response) => {
  const patientId = (req.user as any)?.patientId;

  if (!patientId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized',
    });
  }

  const feedbacks = await prisma.feedback.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        select: {
          appointmentDate: true,
          department: true,
        },
      },
      staff: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: feedbacks,
  });
});

// ==========================================
// DELETE FEEDBACK (ADMIN ONLY)
// ==========================================
export const deleteFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const feedback = await prisma.feedback.findUnique({
    where: { id },
  });

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found',
    });
  }

  await prisma.feedback.delete({
    where: { id },
  });

  // Log deletion
  await prisma.auditLog.create({
    data: {
      userId: (req.user as any)?.id,
      action: 'DELETE',
      entity: 'Feedback',
      entityId: id,
      severity: 'INFO',
    },
  });

  res.json({
    success: true,
    message: 'Feedback deleted successfully',
  });
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateSentiment(rating: number, comments?: string): number {
  // Simple sentiment calculation based on rating and keywords
  let baseSentiment = (rating - 3) / 2; // Convert 1-5 to -1 to 1

  if (comments) {
    const positiveWords = ['excellent', 'great', 'good', 'helpful', 'friendly', 'professional', 'thank'];
    const negativeWords = ['bad', 'poor', 'slow', 'rude', 'wait', 'terrible', 'worst'];

    const lowerComments = comments.toLowerCase();
    let wordScore = 0;

    positiveWords.forEach((word) => {
      if (lowerComments.includes(word)) wordScore += 0.1;
    });

    negativeWords.forEach((word) => {
      if (lowerComments.includes(word)) wordScore -= 0.1;
    });

    baseSentiment = Math.max(-1, Math.min(1, baseSentiment + wordScore));
  }

  return parseFloat(baseSentiment.toFixed(2));
}

function extractKeywords(comments?: string): string[] {
  if (!comments) return [];

  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'and', 'but', 'or', 'nor', 'for',
    'yet', 'so', 'in', 'on', 'at', 'to', 'of', 'with', 'by', 'from',
    'up', 'about', 'into', 'over', 'after', 'i', 'me', 'my', 'myself',
    'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'very',
  ]);

  const words = comments
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Get unique words
  return [...new Set(words)].slice(0, 5);
}