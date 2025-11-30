import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Validation schemas
const createPatientSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().transform((val) => new Date(val)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  phoneNumber: z.string().min(10, 'Valid phone number required'),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([]),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

export class PatientController {
  // Create a new patient profile
  static async createPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = createPatientSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Check if patient already exists
      const existingPatient = await prisma.patient.findUnique({
        where: { studentId: validatedData.studentId },
      });

      if (existingPatient) {
        res.status(409).json({
          success: false,
          error: 'Patient with this student ID already exists',
        });
        return;
      }

      const patient = await prisma.patient.create({
        data: {
          ...validatedData,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      logger.info(`Patient profile created: ${patient.id}`, {
        patientId: patient.id,
        userId,
      });

      res.status(201).json({
        success: true,
        data: patient,
        message: 'Patient profile created successfully',
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

      logger.error('Error creating patient profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create patient profile',
      });
    }
  }

  // Get patient by ID
  static async getPatientById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
          healthAssessments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          appointments: {
            orderBy: { appointmentDate: 'desc' },
            take: 5,
            include: {
              staff: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: true,
                },
              },
            },
          },
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          error: 'Patient not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error('Error fetching patient:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient',
      });
    }
  }

  // Get patient by student ID
  static async getPatientByStudentId(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      const patient = await prisma.patient.findUnique({
        where: { studentId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          error: 'Patient not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error('Error fetching patient by student ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient',
      });
    }
  }

  // Update patient profile
  static async updatePatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updatePatientSchema.parse(req.body);

      const patient = await prisma.patient.findUnique({
        where: { id },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          error: 'Patient not found',
        });
        return;
      }

      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: validatedData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      logger.info(`Patient profile updated: ${id}`, {
        patientId: id,
        userId: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        data: updatedPatient,
        message: 'Patient profile updated successfully',
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

      logger.error('Error updating patient profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update patient profile',
      });
    }
  }

  // Get patient's medical history
  static async getPatientMedicalHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [consultations, total] = await Promise.all([
        prisma.consultation.findMany({
          where: { patientId: id },
          include: {
            appointment: {
              select: {
                appointmentDate: true,
                appointmentTime: true,
                department: true,
              },
            },
            staff: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
            prescriptions: true,
            vitalSigns: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.consultation.count({
          where: { patientId: id },
        }),
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
      logger.error('Error fetching patient medical history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch medical history',
      });
    }
  }

  // Get all patients (admin/staff only)
  static async getAllPatients(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;

      const where = search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { studentId: { contains: search, mode: 'insensitive' as const } },
              { phoneNumber: { contains: search } },
            ],
          }
        : {};

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                isActive: true,
              },
            },
            _count: {
              select: {
                appointments: true,
                healthAssessments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.patient.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: patients,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching patients:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patients',
      });
    }
  }

  // Get patient statistics
  static async getPatientStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const [
        totalAppointments,
        completedAppointments,
        upcomingAppointments,
        healthAssessments,
        prescriptions,
      ] = await Promise.all([
        prisma.appointment.count({
          where: { patientId: id },
        }),
        prisma.appointment.count({
          where: { patientId: id, status: 'COMPLETED' },
        }),
        prisma.appointment.count({
          where: {
            patientId: id,
            status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING'] },
            appointmentDate: { gte: new Date() },
          },
        }),
        prisma.healthAssessment.count({
          where: { patientId: id },
        }),
        prisma.prescription.count({
          where: { patientId: id, status: 'ACTIVE' },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalAppointments,
          completedAppointments,
          upcomingAppointments,
          healthAssessments,
          activePrescriptions: prescriptions,
        },
      });
    } catch (error) {
      logger.error('Error fetching patient stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient statistics',
      });
    }
  }
}