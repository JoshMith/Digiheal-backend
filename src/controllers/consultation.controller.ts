import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

const createConsultationSchema = z.object({
  appointmentId: z.string().uuid(),
  chiefComplaint: z.string().min(5),
  historyOfPresentIllness: z.string().optional(),
  physicalExamination: z.any().optional(),
  primaryDiagnosis: z.string().min(3),
  differentialDiagnosis: z.array(z.string()).default([]),
  clinicalAssessment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpInstructions: z.string().optional(),
  consultationNotes: z.string().optional(),
  vitalSigns: z.object({
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional(),
    heartRate: z.number().optional(),
    temperature: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    respiratoryRate: z.number().optional(),
  }).optional(),
  prescriptions: z.array(z.object({
    medicationName: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
  })).optional(),
});

export class ConsultationController {
  static async createConsultation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = createConsultationSchema.parse(req.body);
      const staffId = req.user?.userId;

      if (!staffId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const staff = await prisma.staff.findUnique({ where: { userId: staffId } });
      if (!staff) {
        res.status(403).json({ success: false, error: 'Staff profile not found' });
        return;
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: validatedData.appointmentId },
      });

      if (!appointment) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }

      // Create consultation with vital signs and prescriptions in transaction
      const consultation = await prisma.$transaction(async (tx) => {
        // Create vital signs if provided
        let vitalSignsId = null;
        if (validatedData.vitalSigns) {
          const vitalSigns = await tx.vitalSigns.create({
            data: {
              patientId: appointment.patientId,
              ...validatedData.vitalSigns,
              recordedAt: new Date(),
            },
          });
          vitalSignsId = vitalSigns.id;
        }

        // Create consultation
        const consult = await tx.consultation.create({
          data: {
            appointmentId: validatedData.appointmentId,
            staffId: staff.id,
            patientId: appointment.patientId,
            chiefComplaint: validatedData.chiefComplaint,
            historyOfPresentIllness: validatedData.historyOfPresentIllness,
            physicalExamination: validatedData.physicalExamination,
            primaryDiagnosis: validatedData.primaryDiagnosis,
            differentialDiagnosis: validatedData.differentialDiagnosis,
            clinicalAssessment: validatedData.clinicalAssessment,
            treatmentPlan: validatedData.treatmentPlan,
            followUpInstructions: validatedData.followUpInstructions,
            consultationNotes: validatedData.consultationNotes,
            vitalSignsId,
          },
        });

        // Create prescriptions if provided
        if (validatedData.prescriptions && validatedData.prescriptions.length > 0) {
          await tx.prescription.createMany({
            data: validatedData.prescriptions.map((rx) => ({
              consultationId: consult.id,
              patientId: appointment.patientId,
              ...rx,
              status: 'ACTIVE',
              prescribedAt: new Date(),
            })),
          });
        }

        // Update appointment status to completed
        await tx.appointment.update({
          where: { id: validatedData.appointmentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        return consult;
      });

      const fullConsultation = await prisma.consultation.findUnique({
        where: { id: consultation.id },
        include: {
          vitalSigns: true,
          prescriptions: true,
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
              position: true,
            },
          },
        },
      });

      logger.info(`Consultation created: ${consultation.id}`);

      res.status(201).json({
        success: true,
        data: fullConsultation,
        message: 'Consultation recorded successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      logger.error('Error creating consultation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create consultation',
      });
    }
  }

  static async getConsultationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const consultation = await prisma.consultation.findUnique({
        where: { id },
        include: {
          vitalSigns: true,
          prescriptions: true,
          patient: true,
          staff: true,
          appointment: true,
        },
      });

      if (!consultation) {
        res.status(404).json({ success: false, error: 'Consultation not found' });
        return;
      }

      res.status(200).json({ success: true, data: consultation });
    } catch (error) {
      logger.error('Error fetching consultation:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch consultation' });
    }
  }

  static async getPatientConsultations(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [consultations, total] = await Promise.all([
        prisma.consultation.findMany({
          where: { patientId },
          include: {
            staff: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
            appointment: {
              select: {
                appointmentDate: true,
                department: true,
              },
            },
            prescriptions: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.consultation.count({ where: { patientId } }),
      ]);

      res.status(200).json({
        success: true,
        data: consultations,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching patient consultations:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch consultations' });
    }
  }
}