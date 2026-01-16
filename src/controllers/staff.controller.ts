import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const createStaffSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.enum([
    'GENERAL_MEDICINE',
    'EMERGENCY',
    'PEDIATRICS',
    'MENTAL_HEALTH',
    'DENTAL',
    'PHARMACY',
    'LABORATORY'
  ]),
  position: z.enum([
    'DOCTOR',
    'NURSE',
    'PHARMACIST',
    'LAB_TECHNICIAN',
    'ADMINISTRATOR',
    'RECEPTIONIST'
  ]),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  phone: z.string().min(10),
});

const updateStaffSchema = createStaffSchema.partial();

export class StaffController {
  // Create staff profile
  static createStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createStaffSchema.parse(req.body);
    const userId = req.user?.userId as string;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { staffId: validatedData.staffId },
    });

    if (existingStaff) {
      res.status(409).json({
        success: false,
        error: 'Staff with this ID already exists',
      });
      return;
    }

    const staff = await prisma.staff.create({
      data: {
        userId,
        staffId: validatedData.staffId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        department: validatedData.department,
        position: validatedData.position,
        specialization: validatedData.specialization ?? null,
        licenseNumber: validatedData.licenseNumber ?? null,
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

    logger.info(`Staff profile created: ${staff.id}`);

    res.status(201).json({
      success: true,
      data: staff,
      message: 'Staff profile created successfully',
    });
  });

  // Get staff by ID
  static getStaffById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            interactions: true,
            prescriptions: true,
          },
        },
      },
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }

    res.status(200).json({ success: true, data: staff });
  });

  // Get all staff
  static getAllStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;
    const department = req.query.department as string | undefined;
    const position = req.query.position as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (department) where.department = department;
    if (position) where.position = position;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { staffId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: staff,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Update staff profile
  static updateStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const validatedData = updateStaffSchema.parse(req.body);

    const staff = await prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }

    // Build update data object
    const updateData: any = {};
    if (validatedData.staffId !== undefined) updateData.staffId = validatedData.staffId;
    if (validatedData.firstName !== undefined) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined) updateData.lastName = validatedData.lastName;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.position !== undefined) updateData.position = validatedData.position;
    if (validatedData.specialization !== undefined) updateData.specialization = validatedData.specialization ?? null;
    if (validatedData.licenseNumber !== undefined) updateData.licenseNumber = validatedData.licenseNumber ?? null;

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    logger.info(`Staff profile updated: ${id}`);

    res.status(200).json({
      success: true,
      data: updatedStaff,
      message: 'Staff profile updated successfully',
    });
  });

  // Get staff schedule
  static getStaffSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const date = req.query.date as string | undefined;

    const appointmentDate = date ? new Date(date) : new Date();
    appointmentDate.setHours(0, 0, 0, 0);

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId: id,
        appointmentDate,
        status: {
          in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'],
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
      },
      orderBy: { appointmentTime: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: {
        date: appointmentDate,
        appointments,
        totalAppointments: appointments.length,
      },
    });
  });

  // Get staff statistics
  static getStaffStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayAppointments,
      totalAppointments,
      completedInteractions,
      pendingAppointments,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          staffId: id,
          appointmentDate: today,
          status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] },
        },
      }),
      prisma.appointment.count({
        where: { staffId: id },
      }),
      prisma.interaction.count({
        where: { 
          staffId: id,
          checkoutTime: { not: null }
        },
      }),
      prisma.appointment.count({
        where: {
          staffId: id,
          status: { in: ['SCHEDULED', 'CHECKED_IN'] },
          appointmentDate: { gte: today },
        },
      }),
    ]);

    // Calculate average interaction duration
    const interactionStats = await prisma.interaction.aggregate({
      where: { 
        staffId: id,
        totalDuration: { not: null }
      },
      _avg: {
        totalDuration: true
      },
      _count: true
    });

    res.status(200).json({
      success: true,
      data: {
        todayAppointments,
        totalAppointments,
        completedInteractions,
        pendingAppointments,
        avgInteractionDuration: interactionStats._avg.totalDuration || 0,
        totalInteractions: interactionStats._count
      },
    });
  });

  // Get staff availability
  static getStaffAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const date = req.query.date as string | undefined;

    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);

    const staff = await prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        isAvailable: true,
        _count: {
          select: {
            appointments: {
              where: {
                appointmentDate: today,
                status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] }
              }
            }
          }
        }
      }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        staffId: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        department: staff.department,
        isAvailable: staff.isAvailable,
        appointmentsToday: staff._count.appointments,
        date: today.toISOString().split('T')[0]
      }
    });
  });

  // Update staff availability
  static updateStaffAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      res.status(400).json({ 
        success: false, 
        error: 'isAvailable must be a boolean' 
      });
      return;
    }

    const staff = await prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: { isAvailable },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        isAvailable: true
      }
    });

    logger.info(`Staff availability updated: ${id} to ${isAvailable}`);

    res.status(200).json({
      success: true,
      data: updatedStaff,
      message: `Staff availability updated to ${isAvailable ? 'available' : 'unavailable'}`
    });
  });
}