import { Request, Response } from 'express';
import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const createConsultationSchema = z.object({
  appointmentId: z.string().uuid(),
  chiefComplaint: z.string().min(5),
  historyOfPresentIllness: z.string().optional(),
  physicalExamination: z.record(z.string(), z.any()).optional(),
  primaryDiagnosis: z.string().min(3),
  differentialDiagnosis: z.array(z.string()).default([]),
  clinicalAssessment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpInstructions: z.string().optional(),
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
  static createConsultation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createConsultationSchema.parse(req.body);
    const staffUserId = req.user?.userId as string;

    if (!staffUserId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const staff = await prisma.staff.findUnique({ where: { userId: staffUserId } });
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
      // Create consultation
      const consult = await tx.consultation.create({
        data: {
          appointmentId: validatedData.appointmentId,
          staffId: staff.id,
          patientId: appointment.patientId,
          chiefComplaint: validatedData.chiefComplaint,
          historyOfPresentIllness: validatedData.historyOfPresentIllness ?? null,
          physicalExamination: validatedData.physicalExamination ?? Prisma.JsonNull,
          primaryDiagnosis: validatedData.primaryDiagnosis ?? null,
          differentialDiagnosis: validatedData.differentialDiagnosis,
          clinicalAssessment: validatedData.clinicalAssessment ?? null,
          treatmentPlan: validatedData.treatmentPlan ?? null,
          followUpInstructions: validatedData.followUpInstructions ?? null,
        },
      });

      // Create vital signs if provided
      if (validatedData.vitalSigns) {
        await tx.vitalSign.create({
          data: {
            patientId: appointment.patientId,
            consultationId: consult.id,
            bloodPressureSystolic: validatedData.vitalSigns.bloodPressureSystolic ?? null,
            bloodPressureDiastolic: validatedData.vitalSigns.bloodPressureDiastolic ?? null,
            heartRate: validatedData.vitalSigns.heartRate ?? null,
            temperature: validatedData.vitalSigns.temperature ?? null,
            weight: validatedData.vitalSigns.weight ?? null,
            height: validatedData.vitalSigns.height ?? null,
            oxygenSaturation: validatedData.vitalSigns.oxygenSaturation ?? null,
            respiratoryRate: validatedData.vitalSigns.respiratoryRate ?? null,
          },
        });
      }

      // Create prescriptions if provided
      if (validatedData.prescriptions && validatedData.prescriptions.length > 0) {
        await tx.prescription.createMany({
          data: validatedData.prescriptions.map((rx) => ({
            consultationId: consult.id,
            patientId: appointment.patientId,
            staffId: staff.id,
            medicationName: rx.medicationName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions ?? null,
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
  });

  static getConsultationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

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
  });

  static getPatientConsultations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patientId = req.params.patientId as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
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
  });
}