import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

// Validation schemas
const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  staffId: z.string().uuid('Invalid staff ID'),
  appointmentId: z.string().uuid().optional(),
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  quantity: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  status: z.enum(['ACTIVE', 'DISPENSED', 'COMPLETED', 'CANCELLED', 'EXPIRED']).default('ACTIVE'),
});

const updatePrescriptionSchema = createPrescriptionSchema.partial();

const dispensePrescriptionSchema = z.object({
  dispensedQuantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const refillPrescriptionSchema = z.object({
  refillQuantity: z.number().int().positive(),
  reason: z.string().optional(),
});

export class PrescriptionController {
  // Create a new prescription
  static createPrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createPrescriptionSchema.parse(req.body);

    // Validate patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: validatedData.patientId },
    });

    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
      return;
    }

    // Validate staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: validatedData.staffId },
    });

    if (!staff) {
      res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
      return;
    }

    // Validate appointment exists if provided
    if (validatedData.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: validatedData.appointmentId },
      });

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: 'Appointment not found',
        });
        return;
      }

      // Verify appointment belongs to the same patient
      if (appointment.patientId !== validatedData.patientId) {
        res.status(400).json({
          success: false,
          error: 'Appointment does not belong to the specified patient',
        });
        return;
      }
    }

    // Calculate expiration date (default: 30 days from now)
    const prescribedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Default 30-day expiration

    const prescription = await prisma.prescription.create({
      data: {
        patientId: validatedData.patientId,
        staffId: validatedData.staffId,
        appointmentId: validatedData.appointmentId ?? null,
        medicationName: validatedData.medicationName,
        dosage: validatedData.dosage,
        frequency: validatedData.frequency,
        duration: validatedData.duration,
        quantity: validatedData.quantity ?? null,
        instructions: validatedData.instructions ?? null,
        status: validatedData.status,
        prescribedAt,
        expiresAt,
      },
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
            appointmentTime: true,
          },
        },
      },
    });

    logger.info(`Prescription created: ${prescription.id}`, {
      prescriptionId: prescription.id,
      patientId: validatedData.patientId,
      staffId: validatedData.staffId,
    });

    res.status(201).json({
      success: true,
      data: prescription,
      message: 'Prescription created successfully',
    });
  });

  // Get prescription by ID
  static getPrescriptionById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
            allergies: true,
            chronicConditions: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            specialization: true,
            licenseNumber: true,
          },
        },
        appointment: {
          select: {
            appointmentDate: true,
            appointmentTime: true,
            department: true,
            type: true,
          },
        },
      },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        error: 'Prescription not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  });

  // Get prescriptions for a patient
  static getPatientPrescriptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patientId = req.params.patientId as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const activeOnly = req.query.activeOnly === 'true';

    const where: any = { patientId };
    
    if (status) {
      where.status = status;
    } else if (activeOnly) {
      where.status = 'ACTIVE';
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
        orderBy: { prescribedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.prescription.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: prescriptions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Get prescriptions issued by a staff member
  static getStaffPrescriptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const staffId = req.params.staffId as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const where: any = { staffId };
    
    if (startDate || endDate) {
      where.prescribedAt = {};
      if (startDate) where.prescribedAt.gte = new Date(startDate);
      if (endDate) where.prescribedAt.lte = new Date(endDate);
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
        },
        orderBy: { prescribedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.prescription.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: prescriptions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Update prescription
  static updatePrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const validatedData = updatePrescriptionSchema.parse(req.body);

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        error: 'Prescription not found',
      });
      return;
    }

    // Build update data object
    const updateData: any = {};
    if (validatedData.medicationName !== undefined) updateData.medicationName = validatedData.medicationName;
    if (validatedData.dosage !== undefined) updateData.dosage = validatedData.dosage;
    if (validatedData.frequency !== undefined) updateData.frequency = validatedData.frequency;
    if (validatedData.duration !== undefined) updateData.duration = validatedData.duration;
    if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity ?? null;
    if (validatedData.instructions !== undefined) updateData.instructions = validatedData.instructions ?? null;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const updatedPrescription = await prisma.prescription.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
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

    logger.info(`Prescription updated: ${id}`, {
      prescriptionId: id,
    });

    res.status(200).json({
      success: true,
      data: updatedPrescription,
      message: 'Prescription updated successfully',
    });
  });

  // Dispense prescription
  static dispensePrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const validatedData = dispensePrescriptionSchema.parse(req.body);

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        error: 'Prescription not found',
      });
      return;
    }

    if (prescription.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        error: `Cannot dispense ${prescription.status.toLowerCase()} prescription`,
      });
      return;
    }

    if (prescription.expiresAt && prescription.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        error: 'Prescription has expired',
      });
      return;
    }

    const updatedPrescription = await prisma.prescription.update({
      where: { id },
      data: {
        status: 'DISPENSED',
        dispensedAt: new Date(),
        quantity: validatedData.dispensedQuantity ?? prescription.quantity,
      },
    });

    logger.info(`Prescription dispensed: ${id}`, {
      prescriptionId: id,
      dispensedAt: updatedPrescription.dispensedAt,
    });

    res.status(200).json({
      success: true,
      data: updatedPrescription,
      message: 'Prescription dispensed successfully',
    });
  });

  // Complete prescription (when medication course is finished)
  static completePrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { notes } = req.body;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        error: 'Prescription not found',
      });
      return;
    }

    if (prescription.status !== 'ACTIVE' && prescription.status !== 'DISPENSED') {
      res.status(400).json({
        success: false,
        error: `Cannot complete ${prescription.status.toLowerCase()} prescription`,
      });
      return;
    }

    const updatedPrescription = await prisma.prescription.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        instructions: notes ? `${prescription.instructions || ''}\n\nCompleted notes: ${notes}` : prescription.instructions,
      },
    });

    logger.info(`Prescription completed: ${id}`, {
      prescriptionId: id,
    });

    res.status(200).json({
      success: true,
      data: updatedPrescription,
      message: 'Prescription marked as completed',
    });
  });

  // Cancel prescription
  static cancelPrescription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Cancellation reason is required',
      });
      return;
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      res.status(404).json({
        success: false,
        error: 'Prescription not found',
      });
      return;
    }

    if (prescription.status === 'CANCELLED' || prescription.status === 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: `Prescription is already ${prescription.status.toLowerCase()}`,
      });
      return;
    }

    const updatedPrescription = await prisma.prescription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        instructions: reason ? `${prescription.instructions || ''}\n\nCancelled: ${reason}` : prescription.instructions,
      },
    });

    logger.info(`Prescription cancelled: ${id}`, {
      prescriptionId: id,
      reason,
    });

    res.status(200).json({
      success: true,
      data: updatedPrescription,
      message: 'Prescription cancelled successfully',
    });
  });

  // Get active prescriptions (for dashboard)
  static getActivePrescriptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt((req.query.limit as string) || '50');
    
    const prescriptions = await prisma.prescription.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
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
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
      take: limit,
    });

    res.status(200).json({
      success: true,
      data: prescriptions,
      count: prescriptions.length,
    });
  });

  // Get prescriptions expiring soon (for reminders)
  static getExpiringPrescriptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const days = parseInt((req.query.days as string) || '7');
    
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    const prescriptions = await prisma.prescription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          not: null,
          lte: expirationDate,
          gt: new Date(), // Not already expired
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
            phone: true,
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: prescriptions,
      count: prescriptions.length,
      expirationThreshold: days,
    });
  });

  // Get prescription statistics
  static getPrescriptionStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const days = parseInt((req.query.days as string) || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalPrescriptions,
      activePrescriptions,
      dispensedPrescriptions,
      completedPrescriptions,
      byMedication,
      byStaff
    ] = await Promise.all([
      // Total prescriptions in period
      prisma.prescription.count({
        where: { prescribedAt: { gte: startDate } },
      }),
      // Active prescriptions
      prisma.prescription.count({
        where: { 
          prescribedAt: { gte: startDate },
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      // Dispensed prescriptions
      prisma.prescription.count({
        where: { 
          prescribedAt: { gte: startDate },
          status: 'DISPENSED',
        },
      }),
      // Completed prescriptions
      prisma.prescription.count({
        where: { 
          prescribedAt: { gte: startDate },
          status: 'COMPLETED',
        },
      }),
      // Top medications
      prisma.prescription.groupBy({
        by: ['medicationName'],
        where: { prescribedAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { staffId: 'desc' } },
        take: 10,
      }),
      // Top prescribing staff
      prisma.prescription.groupBy({
        by: ['staffId'],
        where: { prescribedAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { staffId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get staff names for the top prescribing staff
    const staffIds = byStaff.map(item => item.staffId);
    const staffMembers = await prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const staffWithNames = byStaff.map(item => {
      const staff = staffMembers.find(s => s.id === item.staffId);
      return {
        staffId: item.staffId,
        staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown',
        count: item._count,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalPrescriptions,
        activePrescriptions,
        dispensedPrescriptions,
        completedPrescriptions,
        byMedication,
        byStaff: staffWithNames,
        period: `${days} days`,
      },
    });
  });
}