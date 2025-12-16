// src/controllers/virtualConsultation.controller.ts
// Objective 1: Virtual Consultations for Patient Portal

import { Request, Response } from 'express';
import prisma from '../config/database';
import asyncHandler from '../middleware/asyncHandler';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// CREATE VIRTUAL CONSULTATION SESSION
// ==========================================
export const createVirtualSession = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.body;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      staff: true,
    },
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  if (appointment.consultationType !== 'VIRTUAL') {
    return res.status(400).json({
      success: false,
      message: 'Appointment is not a virtual consultation',
    });
  }

  const existingSession = await prisma.virtualConsultation.findUnique({
    where: { appointmentId },
  });

  if (existingSession) {
    return res.json({
      success: true,
      message: 'Virtual session already exists',
      data: existingSession,
    });
  }

  const sessionId = uuidv4();
  const sessionUrl = generateJitsiUrl(sessionId);

  const appointmentDateTime = new Date(appointment.appointmentDate);
  const timeParts = appointment.appointmentTime.split(':').map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const endTime = new Date(appointmentDateTime);
  endTime.setMinutes(endTime.getMinutes() + appointment.duration);

  const virtualSession = await prisma.virtualConsultation.create({
    data: {
      appointmentId,
      patientId: appointment.patientId,
      staffId: appointment.staffId!,
      sessionId,
      sessionUrl,
      platform: 'jitsi',
      status: 'SCHEDULED',
      scheduledStart: appointmentDateTime,
      scheduledEnd: endTime,
    },
    include: {
      patient: {
        select: { firstName: true, lastName: true, email: true },
      },
      staff: {
        select: { firstName: true, lastName: true, specialization: true },
      },
    },
  });

  // Send notification
  await prisma.notification.create({
    data: {
      patientId: appointment.patientId,
      type: 'VIRTUAL_CONSULTATION_LINK',
      title: 'Virtual Consultation Scheduled',
      message: `Your virtual consultation with Dr. ${appointment.staff?.lastName} is scheduled.`,
      priority: 'NORMAL',
      channel: 'EMAIL',
      scheduledFor: new Date(appointmentDateTime.getTime() - 30 * 60 * 1000),
      relatedEntityType: 'virtualConsultation',
      relatedEntityId: virtualSession.id,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Virtual consultation session created',
    data: { ...virtualSession, joinUrl: sessionUrl },
  });
});

// ==========================================
// GET VIRTUAL SESSION
// ==========================================
export const getVirtualSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const session = await prisma.virtualConsultation.findUnique({
    where: { id },
    include: {
      appointment: {
        select: {
          appointmentDate: true,
          appointmentTime: true,
          department: true,
          chiefComplaint: true,
          symptoms: true,
        },
      },
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          allergies: true,
          chronicConditions: true,
        },
      },
      staff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
          department: true,
        },
      },
    },
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Virtual session not found',
    });
  }

  res.json({ success: true, data: session });
});

// ==========================================
// JOIN SESSION - PATIENT
// ==========================================
export const patientJoinSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const patientId = (req.user as any)?.patientId;

  const session = await prisma.virtualConsultation.findUnique({
    where: { id },
  });

  if (!session || session.patientId !== patientId) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or unauthorized',
    });
  }

  const now = new Date();
  const windowStart = new Date(session.scheduledStart.getTime() - 30 * 60 * 1000);

  if (now < windowStart) {
    return res.status(400).json({
      success: false,
      message: 'Session not yet available. Join 30 minutes before scheduled time.',
    });
  }

  // Update session status
  const updatedSession = await prisma.virtualConsultation.update({
    where: { id },
    data: {
      patientJoinedAt: session.patientJoinedAt ?? new Date(),
      status: session.status === 'SCHEDULED' ? 'WAITING_ROOM' : session.status,
    },
  });

  // Update appointment status
  await prisma.appointment.update({
    where: { id: session.appointmentId },
    data: { status: 'WAITING' },
  });

  res.json({
    success: true,
    message: 'Joined successfully',
    data: {
      sessionUrl: session.sessionUrl,
      status: updatedSession.status,
    },
  });
});

// ==========================================
// JOIN SESSION - STAFF
// ==========================================
export const staffJoinSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const staffId = (req.user as any)?.staffId;

  const session = await prisma.virtualConsultation.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
          allergies: true,
          chronicConditions: true,
          currentMedications: true,
        },
      },
    },
  });

  if (!session || session.staffId !== staffId) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or unauthorized',
    });
  }

  const updatedSession = await prisma.virtualConsultation.update({
    where: { id },
    data: {
      staffJoinedAt: session.staffJoinedAt ?? new Date(),
      status: 'IN_PROGRESS',
      actualStart: session.actualStart ?? new Date(),
    },
  });

  // Update appointment
  await prisma.appointment.update({
    where: { id: session.appointmentId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  res.json({
    success: true,
    message: 'Joined successfully',
    data: {
      sessionUrl: session.sessionUrl,
      patient: session.patient,
      status: updatedSession.status,
    },
  });
});

// ==========================================
// END SESSION
// ==========================================
export const endSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { sessionNotes, connectionQuality, technicalIssues } = req.body;

  const session = await prisma.virtualConsultation.findUnique({
    where: { id },
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  const actualEnd = new Date();
  const duration = session.actualStart
    ? Math.round((actualEnd.getTime() - session.actualStart.getTime()) / 60000)
    : 0;

  const updatedSession = await prisma.virtualConsultation.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      actualEnd,
      duration,
      sessionNotes: sessionNotes ?? null,
      connectionQuality: connectionQuality ?? null,
      technicalIssues: technicalIssues ?? null,
    },
  });

  // Update appointment
  await prisma.appointment.update({
    where: { id: session.appointmentId },
    data: { status: 'COMPLETED', completedAt: actualEnd },
  });

  // Request feedback
  await prisma.notification.create({
    data: {
      patientId: session.patientId,
      type: 'FEEDBACK_REQUEST',
      title: 'How was your virtual consultation?',
      message: 'Please take a moment to rate your experience.',
      priority: 'LOW',
      channel: 'IN_APP',
      relatedEntityType: 'appointment',
      relatedEntityId: session.appointmentId,
    },
  });

  res.json({
    success: true,
    message: 'Session ended',
    data: updatedSession,
  });
});

// ==========================================
// GET UPCOMING SESSIONS - PATIENT
// ==========================================
export const getPatientSessions = asyncHandler(async (req: Request, res: Response) => {
  const patientId = (req.user as any)?.patientId;

  const sessions = await prisma.virtualConsultation.findMany({
    where: {
      patientId,
      status: { in: ['SCHEDULED', 'WAITING_ROOM'] },
      scheduledStart: { gte: new Date() },
    },
    include: {
      staff: {
        select: {
          firstName: true,
          lastName: true,
          specialization: true,
          department: true,
          profilePicture: true,
        },
      },
      appointment: {
        select: {
          chiefComplaint: true,
          department: true,
        },
      },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  res.json({ success: true, data: sessions });
});

// ==========================================
// GET UPCOMING SESSIONS - STAFF
// ==========================================
export const getStaffSessions = asyncHandler(async (req: Request, res: Response) => {
  const staffId = (req.user as any)?.staffId;
  const { date } = req.query;

  const where: any = {
    staffId,
    status: { in: ['SCHEDULED', 'WAITING_ROOM', 'IN_PROGRESS'] },
  };

  if (date) {
    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    where.scheduledStart = { gte: targetDate, lt: nextDay };
  } else {
    where.scheduledStart = { gte: new Date() };
  }

  const sessions = await prisma.virtualConsultation.findMany({
    where,
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
      appointment: {
        select: {
          chiefComplaint: true,
          symptoms: true,
          priority: true,
        },
      },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  res.json({ success: true, data: sessions });
});

// ==========================================
// UPDATE SESSION STATUS
// ==========================================
export const updateSessionStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status, technicalIssues } = req.body;

  const session = await prisma.virtualConsultation.update({
    where: { id },
    data: {
      status,
      technicalIssues: technicalIssues ?? undefined,
    },
  });

  res.json({
    success: true,
    message: 'Session status updated',
    data: session,
  });
});

// ==========================================
// CANCEL SESSION
// ==========================================
export const cancelSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { reason } = req.body;

  const session = await prisma.virtualConsultation.findUnique({
    where: { id },
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel a completed or already cancelled session',
    });
  }

  await prisma.virtualConsultation.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  await prisma.appointment.update({
    where: { id: session.appointmentId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
  });

  // Notify patient
  await prisma.notification.create({
    data: {
      patientId: session.patientId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Virtual Consultation Cancelled',
      message: reason || 'Your virtual consultation has been cancelled.',
      priority: 'HIGH',
      channel: 'EMAIL',
    },
  });

  res.json({
    success: true,
    message: 'Session cancelled',
  });
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function generateJitsiUrl(sessionId: string): string {
  // Using public Jitsi server - in production, use your own server
  const roomName = `dkut-medical-${sessionId}`;
  return `https://meet.jit.si/${roomName}`;
}