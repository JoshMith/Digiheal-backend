import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

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
    'OPHTHALMOLOGY',
    'PHARMACY',
    'LABORATORY',
    'RADIOLOGY',
    'NURSING',
    'ADMINISTRATION',
  ]),
  position: z.enum([
    'DOCTOR',
    'NURSE',
    'PHARMACIST',
    'LAB_TECHNICIAN',
    'RADIOLOGIST',
    'ADMINISTRATOR',
    'RECEPTIONIST',
  ]),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  phoneNumber: z.string().min(10),
});

const updateStaffSchema = createStaffSchema.partial();

export class StaffController {
  // Create staff profile
  static async createStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = createStaffSchema.parse(req.body);
      const userId = req.user?.userId;

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
          ...validatedData,
          userId,
          isAvailable: true,
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

      logger.error('Error creating staff profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create staff profile',
      });
    }
  }

  // Get staff by ID
  static async getStaffById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

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
              consultations: true,
            },
          },
        },
      });

      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      res.status(200).json({ success: true, data: staff });
    } catch (error) {
      logger.error('Error fetching staff:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
  }

  // Get all staff
  static async getAllStaff(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const department = req.query.department as string;
      const position = req.query.position as string;

      const where: any = {};
      if (department) where.department = department;
      if (position) where.position = position;

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
    } catch (error) {
      logger.error('Error fetching staff:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
  }

  // Update staff profile
  static async updateStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateStaffSchema.parse(req.body);

      const staff = await prisma.staff.findUnique({ where: { id } });

      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      const updatedStaff = await prisma.staff.update({
        where: { id },
        data: validatedData,
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

      logger.error('Error updating staff profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update staff profile',
      });
    }
  }

  // Toggle staff availability
  static async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const staff = await prisma.staff.findUnique({ where: { id } });

      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      const updatedStaff = await prisma.staff.update({
        where: { id },
        data: { isAvailable: !staff.isAvailable },
      });

      res.status(200).json({
        success: true,
        data: updatedStaff,
        message: `Staff is now ${updatedStaff.isAvailable ? 'available' : 'unavailable'}`,
      });
    } catch (error) {
      logger.error('Error toggling staff availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update availability',
      });
    }
  }

  // Get staff schedule
  static async getStaffSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date } = req.query;

      const appointmentDate = date ? new Date(date as string) : new Date();
      appointmentDate.setHours(0, 0, 0, 0);

      const appointments = await prisma.appointment.findMany({
        where: {
          staffId: id,
          appointmentDate,
          status: {
            in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS'],
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
    } catch (error) {
      logger.error('Error fetching staff schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedule',
      });
    }
  }

  // Get staff statistics
  static async getStaffStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        todayAppointments,
        totalAppointments,
        completedConsultations,
        pendingAppointments,
      ] = await Promise.all([
        prisma.appointment.count({
          where: {
            staffId: id,
            appointmentDate: today,
            status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS'] },
          },
        }),
        prisma.appointment.count({
          where: { staffId: id },
        }),
        prisma.consultation.count({
          where: { staffId: id },
        }),
        prisma.appointment.count({
          where: {
            staffId: id,
            status: { in: ['SCHEDULED', 'CHECKED_IN', 'WAITING'] },
            appointmentDate: { gte: today },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          todayAppointments,
          totalAppointments,
          completedConsultations,
          pendingAppointments,
        },
      });
    } catch (error) {
      logger.error('Error fetching staff stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  }
}