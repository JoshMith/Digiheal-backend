import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

// Validation schemas
const createPatientSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().transform((val) => new Date(val)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().min(10, 'Valid phone number required'),
  bloodGroup: z.enum([
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
  ]).optional(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([]),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactEmail: z.string().optional(),
  insuranceProvider: z.string().optional(),
  policyNumber: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

export class PatientController {
  // Create a new patient profile
  static createPatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createPatientSchema.parse(req.body);
    const userId = req.user?.userId as string;

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
        userId,
        studentId: validatedData.studentId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: validatedData.dateOfBirth,
        gender: validatedData.gender,
        phone: validatedData.phone,
        bloodGroup: validatedData.bloodGroup ?? null,
        allergies: validatedData.allergies,
        chronicConditions: validatedData.chronicConditions,
        currentMedications: validatedData.currentMedications,
        emergencyContactName: validatedData.emergencyContactName ?? null,
        emergencyContactPhone: validatedData.emergencyContactPhone ?? null,
        emergencyContactRelationship: validatedData.emergencyContactRelationship ?? null,
        emergencyContactEmail: validatedData.emergencyContactEmail ?? null,
        insuranceProvider: validatedData.insuranceProvider ?? null,
        policyNumber: validatedData.policyNumber ?? null,
        nationality: validatedData.nationality ?? null,
        address: validatedData.address ?? null,
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
  });

  // Get patient by ID
  static getPatientById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

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
  });

  // Get patient by student ID
  static getPatientByStudentId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const studentId = req.params.studentId as string;

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
  });

  // Update patient profile
  static updatePatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
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

    // Build update data object, converting undefined to null for optional fields
    const updateData: any = {};
    
    if (validatedData.studentId !== undefined) updateData.studentId = validatedData.studentId;
    if (validatedData.firstName !== undefined) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined) updateData.lastName = validatedData.lastName;
    if (validatedData.dateOfBirth !== undefined) updateData.dateOfBirth = validatedData.dateOfBirth;
    if (validatedData.gender !== undefined) updateData.gender = validatedData.gender;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.bloodGroup !== undefined) updateData.bloodGroup = validatedData.bloodGroup ?? null;
    if (validatedData.allergies !== undefined) updateData.allergies = validatedData.allergies;
    if (validatedData.chronicConditions !== undefined) updateData.chronicConditions = validatedData.chronicConditions;
    if (validatedData.currentMedications !== undefined) updateData.currentMedications = validatedData.currentMedications;
    if (validatedData.emergencyContactName !== undefined) updateData.emergencyContactName = validatedData.emergencyContactName ?? null;
    if (validatedData.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = validatedData.emergencyContactPhone ?? null;
    if (validatedData.emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = validatedData.emergencyContactRelationship ?? null;
    if (validatedData.emergencyContactEmail !== undefined) updateData.emergencyContactEmail = validatedData.emergencyContactEmail ?? null;
    if (validatedData.insuranceProvider !== undefined) updateData.insuranceProvider = validatedData.insuranceProvider ?? null;
    if (validatedData.policyNumber !== undefined) updateData.policyNumber = validatedData.policyNumber ?? null;
    if (validatedData.nationality !== undefined) updateData.nationality = validatedData.nationality ?? null;
    if (validatedData.address !== undefined) updateData.address = validatedData.address ?? null;

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData,
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
  });

  // Get patient's medical history
  static getPatientMedicalHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
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
  });

  // Get all patients (admin/staff only)
  static getAllPatients = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { studentId: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
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
  });

  // Get patient statistics
  static getPatientStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

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
  });
}