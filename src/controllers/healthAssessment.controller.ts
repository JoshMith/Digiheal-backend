import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

// Validation schema
const assessmentSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'At least one symptom required'),
  age: z.number().min(0).max(150),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  duration: z.string(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
  additionalNotes: z.string().optional()
});

export class HealthAssessmentController {
  /**
   * POST /api/health-assessments
   */
  createAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate input
    const validatedData = assessmentSchema.parse(req.body);
    const userId = req.user?.userId as string;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Find patient by user ID
    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      res.status(404).json({ success: false, error: 'Patient profile not found' });
      return;
    }

    // TODO: Get ML prediction from ML service
    // For now, create a basic assessment without ML
    const assessment = await prisma.healthAssessment.create({
      data: {
        patientId: patient.id,
        symptoms: validatedData.symptoms,
        additionalInfo: {
          age: validatedData.age,
          gender: validatedData.gender,
          duration: validatedData.duration,
          severity: validatedData.severity,
          notes: validatedData.additionalNotes ?? null,
        },
        predictedDisease: 'Pending Analysis', // Placeholder
        severityScore: validatedData.severity === 'SEVERE' ? 8 : validatedData.severity === 'MODERATE' ? 5 : 3,
        urgency: validatedData.severity === 'SEVERE' ? 'URGENT' : validatedData.severity === 'MODERATE' ? 'MODERATE' : 'LOW',
        recommendations: ['Consult a healthcare provider'],
        confidence: null,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
      },
    });

    logger.info(`Health assessment created: ${assessment.id}`);

    res.status(201).json({
      success: true,
      data: assessment,
      message: 'Health assessment created successfully',
    });
  });

  /**
   * GET /api/health-assessments/:id
   */
  getAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const assessment = await prisma.healthAssessment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      }
    });

    if (!assessment) {
      res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
      return;
    }

    res.json({ success: true, data: assessment });
  });

  /**
   * GET /api/health-assessments/patient/:patientId
   */
  getPatientAssessments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patientId = req.params.patientId as string;
    const assessments = await prisma.healthAssessment.findMany({
      where: { patientId },
      orderBy: { assessmentDate: 'desc' },
      take: 10
    });

    res.json({ success: true, data: assessments });
  });
}