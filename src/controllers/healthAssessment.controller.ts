import { Request, Response, NextFunction } from 'express';
import { MLService } from '../services/ml.service';
import { z } from 'zod';

const mlService = new MLService();

// Validation schema
const assessmentSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'At least one symptom required'),
  age: z.number().min(0).max(150),
  gender: z.enum(['male', 'female', 'other']),
  duration: z.string(),
  severity: z.enum(['mild', 'moderate', 'severe']),
  additionalNotes: z.string().optional()
});

export class HealthAssessmentController {
  /**
   * POST /api/health-assessment
   */
  async createAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const validatedData = assessmentSchema.parse(req.body);
      const patientId = req.user.id; // From JWT middleware

      // Get ML prediction and create assessment
      const result = await mlService.createHealthAssessment(
        patientId,
        validatedData.symptoms,
        {
          age: validatedData.age,
          gender: validatedData.gender,
          duration: validatedData.duration,
          severity: validatedData.severity,
          notes: validatedData.additionalNotes
        }
      );

      res.status(201).json({
        success: true,
        data: {
          assessmentId: result.assessment.id,
          disease: result.prediction.disease,
          urgency: result.prediction.urgency,
          severityScore: result.prediction.severity_score,
          recommendations: result.prediction.workouts,
          message: this.getUrgencyMessage(result.prediction.urgency)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-assessment/:id
   */
  async getAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
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
        return res.status(404).json({
          success: false,
          error: 'Assessment not found'
        });
      }

      res.json({ success: true, data: assessment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-assessment/patient/:patientId
   */
  async getPatientAssessments(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.params;
      const assessments = await prisma.healthAssessment.findMany({
        where: { patientId },
        orderBy: { assessmentDate: 'desc' },
        take: 10
      });

      res.json({ success: true, data: assessments });
    } catch (error) {
      next(error);
    }
  }

  private getUrgencyMessage(urgency: string): string {
    switch (urgency) {
      case 'Urgent':
        return 'Please seek immediate medical attention. Visit the emergency department or call emergency services.';
      case 'Moderate':
        return 'Schedule an appointment with a healthcare provider within 24-48 hours.';
      case 'Low':
        return 'Monitor your symptoms. If they worsen, consider booking an appointment.';
      default:
        return 'Please consult with a healthcare provider for proper evaluation.';
    }
  }
}