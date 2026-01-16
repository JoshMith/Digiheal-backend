import { Request, Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

// Validation schemas
const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  appointmentDate: z.string().transform((val) => new Date(val)),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  duration: z.number().min(15).max(180).default(30),
  department: z.enum([
    'GENERAL_MEDICINE',
    'EMERGENCY',
    'PEDIATRICS',
    'MENTAL_HEALTH',
    'DENTAL',
    'PHARMACY',
    'LABORATORY'
  ]),
  type: z.enum([
    'WALK_IN',
    'SCHEDULED',
    'FOLLOW_UP',
    'EMERGENCY',
    'ROUTINE_CHECKUP'
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  reason: z.string().min(5, 'Please provide a reason'),
  notes: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  appointmentDate: z.string().transform((val) => new Date(val)).optional(),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  status: z.enum([
    'SCHEDULED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
  ]).optional(),
  staffId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(5, 'Please provide a reason for cancellation'),
});

export class AppointmentController {
  // Create a new appointment
  static createAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createAppointmentSchema.parse(req.body);

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

    // Check for conflicting appointments
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        appointmentDate: validatedData.appointmentDate,
        appointmentTime: validatedData.appointmentTime,
        department: validatedData.department,
        status: {
          in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'],
        },
      },
    });

    if (conflictingAppointment) {
      res.status(409).json({
        success: false,
        error: 'Time slot is already booked. Please choose another time.',
      });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: validatedData.patientId,
        appointmentDate: validatedData.appointmentDate,
        appointmentTime: validatedData.appointmentTime,
        duration: validatedData.duration,
        department: validatedData.department,
        type: validatedData.type,
        reason: validatedData.reason,
        notes: validatedData.notes ?? null,
        priority: validatedData.priority,
        status: 'SCHEDULED',
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
    });

    logger.info(`Appointment created: ${appointment.id}`, {
      appointmentId: appointment.id,
      patientId: validatedData.patientId,
    });

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment scheduled successfully',
    });
  });

  // Get appointment by ID
  static getAppointmentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            specialization: true,
          },
        },
        prescriptions: true,
        interaction: true,
      },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  });

  // Get appointments for a patient
  static getPatientAppointments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patientId = req.params.patientId as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
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
        orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: appointments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Update appointment
  static updateAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const validatedData = updateAppointmentSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    // Build update data object
    const updateData: any = {};
    if (validatedData.appointmentDate !== undefined) {
      updateData.appointmentDate = validatedData.appointmentDate;
    }
    if (validatedData.appointmentTime !== undefined) {
      updateData.appointmentTime = validatedData.appointmentTime;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.staffId !== undefined) {
      updateData.staffId = validatedData.staffId ?? null;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes ?? null;
    }

    const updatedAppointment = await prisma.appointment.update({
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

    logger.info(`Appointment updated: ${id}`, {
      appointmentId: id,
    });

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully',
    });
  });

  // Check-in for appointment
  static checkInAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (appointment.status !== 'SCHEDULED') {
      res.status(400).json({
        success: false,
        error: 'Only scheduled appointments can be checked in',
      });
      return;
    }

    // Get queue number for today
    const todayAppointments = await prisma.appointment.count({
      where: {
        appointmentDate: appointment.appointmentDate,
        department: appointment.department,
        status: {
          in: ['CHECKED_IN', 'IN_PROGRESS'],
        },
      },
    });

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        queueNumber: todayAppointments + 1,
        checkedInAt: new Date(),
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Checked in successfully. Your queue number is ' + updatedAppointment.queueNumber,
    });
  });

  // Cancel appointment
  static cancelAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { cancellationReason } = cancelAppointmentSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      res.status(400).json({
        success: false,
        error: `Cannot cancel ${appointment.status.toLowerCase()} appointment`,
      });
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: cancellationReason,
        cancelledAt: new Date(),
      },
    });

    logger.info(`Appointment cancelled: ${id}`, {
      appointmentId: id,
      reason: cancellationReason,
    });

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment cancelled successfully',
    });
  });

  // Get today's appointments by department
  static getTodayAppointments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const department = req.params.department as string;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await prisma.appointment.findMany({
      where: {
        department: department as any,
        appointmentDate: today,
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
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { queueNumber: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  });

  // Get available time slots
  static getAvailableSlots = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const date = req.query.date as string | undefined;
    const department = req.query.department as string | undefined;

    if (!date || !department) {
      res.status(400).json({
        success: false,
        error: 'Date and department are required',
      });
      return;
    }

    const appointmentDate = new Date(date);
    const bookedSlots = await prisma.appointment.findMany({
      where: {
        appointmentDate,
        department: department as any,
        status: {
          in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'],
        },
      },
      select: {
        appointmentTime: true,
        duration: true,
      },
    });

    // Generate available slots (8:00 AM to 5:00 PM)
    const allSlots = [];
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(time);
      }
    }

    // Filter out booked slots
    const availableSlots = allSlots.filter(
      (slot) => !bookedSlots.some((booked) => booked.appointmentTime === slot)
    );

    res.status(200).json({
      success: true,
      data: {
        date: appointmentDate,
        department,
        availableSlots,
        totalSlots: allSlots.length,
        availableCount: availableSlots.length,
      },
    });
  });

  // Get appointments for staff
  static getStaffAppointments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const staffId = req.params.staffId as string;
    const date = req.query.date as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = { staffId };
    if (date) {
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      where.appointmentDate = appointmentDate;
    }
    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
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
      orderBy: [{ appointmentTime: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  });

  // Start appointment (when doctor begins consultation)
  static startAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (appointment.status !== 'CHECKED_IN') {
      res.status(400).json({
        success: false,
        error: 'Only checked-in appointments can be started',
      });
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment started',
    });
  });

  // Complete appointment
  static completeAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (appointment.status !== 'IN_PROGRESS') {
      res.status(400).json({
        success: false,
        error: 'Only in-progress appointments can be completed',
      });
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment completed',
    });
  });

  // Get appointment statistics
  static getAppointmentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      completedToday,
      pendingToday,
      byDepartment,
      byStatus
    ] = await Promise.all([
      // Total appointments today
      prisma.appointment.count({
        where: { appointmentDate: today }
      }),
      // Completed today
      prisma.appointment.count({
        where: { 
          appointmentDate: today,
          status: 'COMPLETED'
        }
      }),
      // Pending today (scheduled + checked in + in progress)
      prisma.appointment.count({
        where: { 
          appointmentDate: today,
          status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'] }
        }
      }),
      // Appointments by department
      prisma.appointment.groupBy({
        by: ['department'],
        where: { appointmentDate: today },
        _count: true
      }),
      // Appointments by status
      prisma.appointment.groupBy({
        by: ['status'],
        where: { appointmentDate: today },
        _count: true
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        completedToday,
        pendingToday,
        byDepartment,
        byStatus
      }
    });
  });
}