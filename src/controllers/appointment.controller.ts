import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../types';
import logger from '../utils/logger';
import { NotificationService } from '../services/notification.service';

const prisma = new PrismaClient();

// Validation schemas
const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  healthAssessmentId: z.string().uuid().optional(),
  appointmentDate: z.string().transform((val) => new Date(val)),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  duration: z.number().min(15).max(180).default(30),
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
  appointmentType: z.enum([
    'CONSULTATION',
    'FOLLOW_UP',
    'EMERGENCY',
    'ROUTINE_CHECKUP',
    'VACCINATION',
    'LAB_TEST',
    'IMAGING',
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  reason: z.string().min(5, 'Please provide a reason for the appointment').optional(),
  notes: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  appointmentDate: z.string().transform((val) => new Date(val)).optional(),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  status: z.enum([
    'SCHEDULED',
    'CHECKED_IN',
    'WAITING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ]).optional(),
  staffId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(5, 'Please provide a reason for cancellation'),
});

export class AppointmentController {
  // Create a new appointment
  static async createAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
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
            in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS'],
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

      // Determine priority from health assessment if provided
      let priority = validatedData.priority;
      if (validatedData.healthAssessmentId) {
        const assessment = await prisma.healthAssessment.findUnique({
          where: { id: validatedData.healthAssessmentId },
        });

        if (assessment) {
          if (assessment.urgency === 'URGENT') priority = 'URGENT';
          else if (assessment.urgency === 'MODERATE') priority = 'HIGH';
        }
      }

      const appointment = await prisma.appointment.create({
        data: {
          ...validatedData,
          priority,
          status: 'SCHEDULED',
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              phoneNumber: true,
            },
          },
          healthAssessment: true,
        },
      });

      // Create notification for appointment confirmation
      await NotificationService.createAppointmentNotification(
        validatedData.patientId,
        appointment.id,
        'APPOINTMENT_REMINDER',
        'Appointment Scheduled',
        `Your appointment has been scheduled for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime}`
      );

      logger.info(`Appointment created: ${appointment.id}`, {
        appointmentId: appointment.id,
        patientId: validatedData.patientId,
      });

      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Appointment scheduled successfully',
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

      logger.error('Error creating appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create appointment',
      });
    }
  }

  // Get appointment by ID
  static async getAppointmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              phoneNumber: true,
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
          healthAssessment: true,
          consultation: {
            include: {
              prescriptions: true,
              vitalSigns: true,
            },
          },
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
    } catch (error) {
      logger.error('Error fetching appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch appointment',
      });
    }
  }

  // Get appointments for a patient
  static async getPatientAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const status = req.query.status as string;

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
            healthAssessment: {
              select: {
                predictedDisease: true,
                urgency: true,
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
    } catch (error) {
      logger.error('Error fetching patient appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch appointments',
      });
    }
  }

  // Update appointment
  static async updateAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
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

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: validatedData,
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
        userId: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        data: updatedAppointment,
        message: 'Appointment updated successfully',
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

      logger.error('Error updating appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update appointment',
      });
    }
  }

  // Check-in for appointment
  static async checkInAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

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
            in: ['CHECKED_IN', 'WAITING', 'IN_PROGRESS'],
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
    } catch (error) {
      logger.error('Error checking in appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check in',
      });
    }
  }

  // Cancel appointment
  static async cancelAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
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
          cancelledAt: new Date(),
          cancellationReason,
        },
      });

      // Notify patient
      await NotificationService.createAppointmentNotification(
        appointment.patientId,
        id,
        'SYSTEM_ANNOUNCEMENT',
        'Appointment Cancelled',
        `Your appointment for ${new Date(appointment.appointmentDate).toLocaleDateString()} has been cancelled. ${cancellationReason}`
      );

      logger.info(`Appointment cancelled: ${id}`, {
        appointmentId: id,
        reason: cancellationReason,
      });

      res.status(200).json({
        success: true,
        data: updatedAppointment,
        message: 'Appointment cancelled successfully',
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

      logger.error('Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel appointment',
      });
    }
  }

  // Get today's appointments by department
  static async getTodayAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { department } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const appointments = await prisma.appointment.findMany({
        where: {
          department: department as any,
          appointmentDate: today,
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
    } catch (error) {
      logger.error('Error fetching today\'s appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch appointments',
      });
    }
  }

  // Get available time slots
  static async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const { date, department } = req.query;

      if (!date || !department) {
        res.status(400).json({
          success: false,
          error: 'Date and department are required',
        });
        return;
      }

      const appointmentDate = new Date(date as string);
      const bookedSlots = await prisma.appointment.findMany({
        where: {
          appointmentDate,
          department: department as any,
          status: {
            in: ['SCHEDULED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS'],
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
    } catch (error) {
      logger.error('Error fetching available slots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available slots',
      });
    }
  }
}