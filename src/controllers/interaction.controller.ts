import { Request, Response } from "express";
import prisma from "../config/database";
import { asyncHandler } from "../middleware/errorHandler";
import { exportTrainingData, predictDuration } from "../services/ml.service";

export class InteractionController {
  // Start new interaction (when patient checks in)
  static startInteraction = asyncHandler(
    async (req: Request, res: Response) => {
      const { appointmentId } = req.body;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true },
      });

      if (!appointment) {
        return res
          .status(404)
          .json({ success: false, error: "Appointment not found" });
      }

      // Get ML prediction
      const predictedDuration = await predictDuration({
        department: appointment.department,
        priority: appointment.priority,
        appointmentType: appointment.type,
        symptomCount: 1, // Default - you might want to get this from somewhere
      });

      // Create interaction
      const interaction = await prisma.interaction.create({
        data: {
          appointmentId,
          patientId: appointment.patientId,
          staffId: req.user?.staffId || req.user?.userId || "system",
          department: appointment.department,
          priority: appointment.priority,
          appointmentType: appointment.type,
          symptomCount: 1, // Default symptom count
          checkInTime: new Date(),
          predictedDuration: predictedDuration.predictedDuration,
        },
      });

      res.status(201).json({
        success: true,
        data: interaction,
        predictedDuration, // Return prediction info to client
      });
    },
  );

  // End interaction phases
  static startVitals = asyncHandler(async (req: Request, res: Response) => {
    await prisma.interaction.update({
      where: { id: req.params.id as string },
      data: { vitalsStartTime: new Date() },
    });
    res.json({ success: true, message: "Vitals started" });
  });

  static endVitals = asyncHandler(async (req: Request, res: Response) => {
    const interaction = await prisma.interaction.update({
      where: { id: req.params.id as string },
      data: { vitalsEndTime: new Date() },
    });

    // Calculate duration
    if (interaction.vitalsStartTime && interaction.vitalsEndTime) {
      const duration = Math.round(
        (interaction.vitalsEndTime.getTime() -
          interaction.vitalsStartTime.getTime()) /
          60000,
      );
      await prisma.interaction.update({
        where: { id: req.params.id as string },
        data: { vitalsDuration: duration },
      });
    }

    res.json({ success: true, message: "Vitals completed" });
  });

  static startConsultation = asyncHandler(
    async (req: Request, res: Response) => {
      await prisma.interaction.update({
        where: { id: req.params.id as string },
        data: { interactionStartTime: new Date() },
      });
      res.json({ success: true, message: "Consultation started" });
    },
  );

  static endConsultation = asyncHandler(async (req: Request, res: Response) => {
    const interaction = await prisma.interaction.update({
      where: { id: req.params.id as string },
      data: { interactionEndTime: new Date() },
    });

    if (interaction.interactionStartTime && interaction.interactionEndTime) {
      const duration = Math.round(
        (interaction.interactionEndTime.getTime() -
          interaction.interactionStartTime.getTime()) /
          60000,
      );
      await prisma.interaction.update({
        where: { id: req.params.id as string },
        data: { interactionDuration: duration },
      });
    }

    res.json({ success: true, message: "Consultation ended" });
  });

  static checkout = asyncHandler(async (req: Request, res: Response) => {
    const interaction = await prisma.interaction.update({
      where: { id: req.params.id as string },
      data: { checkoutTime: new Date() },
    });

    // Calculate total duration
    if (interaction.checkInTime && interaction.checkoutTime) {
      const totalDuration = Math.round(
        (interaction.checkoutTime.getTime() -
          interaction.checkInTime.getTime()) /
          60000,
      );
      await prisma.interaction.update({
        where: { id: req.params.id as string },
        data: { totalDuration },
      });
    }

    res.json({ success: true, message: "Checkout complete" });
  });

  // Get current queue - FIXED VERSION
  static getQueue = asyncHandler(async (req: Request, res: Response) => {
    const queue = await prisma.interaction.findMany({
      where: {
        checkoutTime: null, // Not checked out yet
        checkInTime: { not: null } as any, // Type assertion to fix Prisma type issue
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, studentId: true },
        },
        appointment: {
          select: { reason: true, priority: true },
        },
      },
      orderBy: [{ priority: "desc" }, { checkInTime: "asc" }],
    });

    res.json({ success: true, data: queue });
  });

  // Get interaction statistics
  static getStats = asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      avgDuration,
      byDepartment,
      byPriority,
      activeInteractions,
      completedToday,
    ] = await Promise.all([
      // Total interactions today
      prisma.interaction.count({
        where: { checkInTime: { gte: today } },
      }),

      // Average total duration
      prisma.interaction.aggregate({
        where: { totalDuration: { not: null } },
        _avg: { totalDuration: true },
      }),

      // Interactions by department
      prisma.interaction.groupBy({
        by: ["department"],
        where: { checkInTime: { gte: today } },
        _count: true,
      }),

      // Interactions by priority
      prisma.interaction.groupBy({
        by: ["priority"],
        where: { checkInTime: { gte: today } },
        _count: true,
      }),

      // Active interactions (not checked out)
      prisma.interaction.count({
        where: {
          checkInTime: { gte: today },
          checkoutTime: null,
        },
      }),

      // Completed interactions today
      prisma.interaction.count({
        where: {
          checkInTime: { gte: today },
          checkoutTime: { not: null },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalToday,
        avgDuration: avgDuration._avg.totalDuration || 0,
        byDepartment,
        byPriority,
        activeInteractions,
        completedToday,
        completionRate:
          totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
      },
    });
  });

  // Export data for ML training
  static exportTrainingData = asyncHandler(
    async (req: Request, res: Response) => {
      const interactions = await prisma.interaction.findMany({
        where: {
          totalDuration: { not: null },
          predictedDuration: { not: null },
        },
        select: {
          department: true,
          priority: true,
          appointmentType: true,
          symptomCount: true,
          totalDuration: true,
          predictedDuration: true,
          checkInTime: true,
        },
      });

      // Format for ML training
      const trainingData = interactions.map((i) => ({
        department: i.department,
        priority: i.priority,
        appointmentType: i.appointmentType,
        symptomCount: i.symptomCount,
        timeOfDay: i.checkInTime.getHours(),
        dayOfWeek: i.checkInTime.getDay(),
        actualDuration: i.totalDuration,
        predictedDuration: i.predictedDuration,
      }));

      // Export to ML service
      const exportSuccess = await exportTrainingData(trainingData);

      res.json({
        success: true,
        data: trainingData,
        exportedToML: exportSuccess,
        message: exportSuccess
          ? "Training data exported successfully"
          : "Failed to export to ML service",
      });
    },
  );

  // Get single interaction by ID
  static getInteraction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as any;

    const interaction = await prisma.interaction.findUnique({
      where: { id },
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
            reason: true,
            notes: true,
          },
        },
      },
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: "Interaction not found",
      });
    }

    res.json({ success: true, data: interaction });
  });

  // Get interactions by patient ID
  static getPatientInteractions = asyncHandler(
    async (req: Request, res: Response) => {
      const { patientId } = req.params as any;
      const limit = parseInt(req.query.limit as string) || 20;

      const interactions = await prisma.interaction.findMany({
        where: { patientId },
        include: {
          staff: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
          appointment: {
            select: {
              reason: true,
              type: true,
            },
          },
        },
        orderBy: { checkInTime: "desc" },
        take: limit,
      });

      res.json({ success: true, data: interactions });
    },
  );

  // Get interactions by staff ID
  static getStaffInteractions = asyncHandler(
    async (req: Request, res: Response) => {
      const { staffId } = req.params as any;
      const limit = parseInt(req.query.limit as string) || 20;

      const interactions = await prisma.interaction.findMany({
        where: { staffId },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
          appointment: {
            select: {
              reason: true,
              type: true,
            },
          },
        },
        orderBy: { checkInTime: "desc" },
        take: limit,
      });

      res.json({ success: true, data: interactions });
    },
  );
}
