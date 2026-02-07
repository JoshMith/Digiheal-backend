import { Request, Response } from "express";
import prisma from "../config/database";
import { asyncHandler } from "../middleware/errorHandler";
import { checkHealth, getModelInfo } from "../services/ml.service";

export class AnalyticsController {
  static getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatientsToday,
      avgWaitTime,
      avgInteractionTime,
      totalAppointments,
      noShowCount,
      completedAppointments,
    ] = await Promise.all([
      // Total patients today
      prisma.interaction.count({
        where: {
          checkInTime: { gte: today },
        },
      }),

      // Average wait time (check-in to consultation start)
      prisma.interaction.aggregate({
        where: {
          vitalsDuration: { not: null },
        },
        _avg: {
          vitalsDuration: true,
        },
      }),

      // Average interaction time
      prisma.interaction.aggregate({
        where: {
          interactionDuration: { not: null },
        },
        _avg: {
          interactionDuration: true,
        },
      }),

      // Total appointments today
      prisma.appointment.count({
        where: {
          appointmentDate: today,
        },
      }),

      // No-shows
      prisma.appointment.count({
        where: {
          appointmentDate: today,
          status: "NO_SHOW",
        },
      }),

      // Completed appointments today
      prisma.appointment.count({
        where: {
          appointmentDate: today,
          status: "COMPLETED",
        },
      }),
    ]);

    // Get ML service health and model info
    const mlHealth = await checkHealth();
    const modelInfo = await getModelInfo();

    // Calculate ML accuracy (simulated)
    const interactionsWithPredictions = await prisma.interaction.findMany({
      where: {
        predictedDuration: { not: null },
        totalDuration: { not: null },
      },
      select: {
        predictedDuration: true,
        totalDuration: true,
      },
    });

    let mlAccuracy = 0;
    if (interactionsWithPredictions.length > 0) {
      const accuratePredictions = interactionsWithPredictions.filter(
        (interaction) => {
          const diff = Math.abs(
            (interaction.totalDuration || 0) -
              (interaction.predictedDuration || 0),
          );
          return diff <= 10; // Consider prediction accurate if within 10 minutes
        },
      ).length;
      mlAccuracy =
        (accuratePredictions / interactionsWithPredictions.length) * 100;
    }

    res.json({
      success: true,
      data: {
        totalPatientsToday,
        avgWaitTime: avgWaitTime._avg.vitalsDuration || 0,
        avgInteractionTime: avgInteractionTime._avg.interactionDuration || 0,
        totalAppointments,
        completedAppointments,
        noShowCount,
        noShowRate:
          totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0,
        completionRate:
          totalAppointments > 0
            ? (completedAppointments / totalAppointments) * 100
            : 0,
        mlServiceStatus: mlHealth?.status || "unavailable",
        mlModelType: modelInfo?.modelType || "unknown",
        mlAccuracy: Math.round(mlAccuracy * 100) / 100,
      },
    });
  });

  static getPatientFlow = asyncHandler(async (req: Request, res: Response) => {
    const granularity = (req.query.granularity as string) || "daily";

    if (granularity === "hourly") {
      // Get today's data by hour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const interactions = await prisma.interaction.findMany({
        where: {
          checkInTime: {
            gte: today,
            lte: endOfDay,
          },
        },
        select: {
          checkInTime: true,
        },
      });

      // Group by hour
      const hourlyData: Record<number, number> = {};
      interactions.forEach((interaction) => {
        const hour = new Date(interaction.checkInTime).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      });

      // Format for chart (8 AM to 5 PM)
      const data = [];
      for (let hour = 8; hour <= 17; hour++) {
        data.push({
          time: `${hour.toString().padStart(2, "0")}:00`,
          hour: `${hour.toString().padStart(2, "0")}:00`,
          patients: hourlyData[hour] || 0,
          count: hourlyData[hour] || 0,
        });
      }

      return res.json({
        success: true,
        data,
        period: "today",
        granularity: "hourly",
      });
    }

    // ... existing daily logic for granularity === 'daily'
  });

  static getWaitTimes = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;
  const granularity = (req.query.granularity as string) || 'daily';
  
  if (granularity === 'daily') {
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Get actual wait times
      const interactions = await prisma.interaction.findMany({
        where: {
          checkInTime: {
            gte: date,
            lte: endDate,
          },
          totalDuration: { not: null },
          predictedDuration: { not: null }
        },
        select: {
          totalDuration: true,
          predictedDuration: true,
          vitalsDuration: true,
        },
      });

      const avgActual = interactions.length > 0
        ? interactions.reduce((sum, i) => sum + (i.totalDuration || 0), 0) / interactions.length
        : 0;
      
      const avgPredicted = interactions.length > 0
        ? interactions.reduce((sum, i) => sum + (i.predictedDuration || 0), 0) / interactions.length
        : 0;

      data.push({
        date: date.toISOString().split('T')[0],
        actualWaitTime: Math.round(avgActual),
        avgWait: Math.round(avgActual),
        predictedWaitTime: Math.round(avgPredicted),
        predicted: Math.round(avgPredicted),
        sampleSize: interactions.length
      });
    }

    return res.json({
      success: true,
      data,
      period: `${days} days`,
      granularity: 'daily'
    });
  }

  // ... existing department grouping logic for other use cases
});
  static getDepartmentLoad = asyncHandler(
    async (req: Request, res: Response) => {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get appointments by department
      const appointmentsByDept = await prisma.appointment.groupBy({
        by: ["department"],
        where: {
          appointmentDate: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      });

      // Get interactions by department
      const interactionsByDept = await prisma.interaction.groupBy({
        by: ["department"],
        where: {
          checkInTime: { gte: startDate },
        },
        _count: true,
      });

      // Combine data
      const departmentMap = new Map();

      // Add appointments
      appointmentsByDept.forEach((dept) => {
        departmentMap.set(dept.department, {
          department: dept.department,
          appointments: dept._count,
          interactions: 0,
          utilization: 0,
        });
      });

      // Add interactions
      interactionsByDept.forEach((dept) => {
        if (departmentMap.has(dept.department)) {
          const data = departmentMap.get(dept.department);
          data.interactions = dept._count;
          // Calculate utilization (interactions/appointments)
          data.utilization =
            data.appointments > 0
              ? Math.round((dept._count / data.appointments) * 100)
              : 0;
        } else {
          departmentMap.set(dept.department, {
            department: dept.department,
            appointments: 0,
            interactions: dept._count,
            utilization: 0,
          });
        }
      });

      const data = Array.from(departmentMap.values());

      // Calculate total utilization
      const totalAppointments = data.reduce(
        (sum, dept) => sum + dept.appointments,
        0,
      );
      const totalInteractions = data.reduce(
        (sum, dept) => sum + dept.interactions,
        0,
      );
      const overallUtilization =
        totalAppointments > 0
          ? Math.round((totalInteractions / totalAppointments) * 100)
          : 0;

      res.json({
  success: true,
  data: data,  // ✅ Return departments array directly
  meta: {
    totalAppointments,
    totalInteractions,
    overallUtilization,
    period: `${days} days`,
  },
});
    },
  );

  static getStaffPerformance = asyncHandler(
    async (req: Request, res: Response) => {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const limit = parseInt(req.query.limit as string) || 10;

      // Get staff with their interaction counts and average durations
      const staffPerformance = await prisma.staff.findMany({
        where: {
          interactions: {
            some: {
              checkInTime: { gte: startDate },
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          position: true,
          _count: {
            select: {
              interactions: {
                where: {
                  checkInTime: { gte: startDate },
                },
              },
            },
          },
          interactions: {
            where: {
              checkInTime: { gte: startDate },
            },
            select: {
              totalDuration: true,
              interactionDuration: true,
            },
          },
        },
        take: limit,
        orderBy: {
          interactions: {
            _count: "desc",
          },
        },
      });

      // Calculate averages
      const formattedPerformance = staffPerformance.map((staff) => {
        const validInteractions = staff.interactions.filter(
          (i) => i.totalDuration !== null,
        );
        const totalPatients = validInteractions.length;
        const totalDuration = validInteractions.reduce(
          (sum, i) => sum + (i.totalDuration || 0),
          0,
        );
        const avgDuration =
          totalPatients > 0 ? Math.round(totalDuration / totalPatients) : 0;

        return {
          staffId: staff.id,
          name: `${staff.firstName} ${staff.lastName}`,
          department: staff.department,
          position: staff.position,
          totalPatients: staff._count.interactions,
          avgDuration,
          efficiency:
            avgDuration > 0
              ? Math.round((totalPatients * 60) / avgDuration)
              : 0, // patients per hour
        };
      });

      res.json({
        success: true,
        data: formattedPerformance,
        period: `${days} days`,
      });
    },
  );

  static getPredictionAccuracy = asyncHandler(
  async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const interactions = await prisma.interaction.findMany({
      where: {
        predictedDuration: { not: null },
        totalDuration: { not: null },
        checkInTime: { gte: startDate },
      },
      select: {
        predictedDuration: true,
        totalDuration: true,
        checkInTime: true,
      },
      orderBy: {
        checkInTime: 'desc',
      },
    });

    // Group by week
    const weeklyData: Record<string, { errors: number[]; count: number }> = {};
    
    interactions.forEach((interaction) => {
      const date = new Date(interaction.checkInTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { errors: [], count: 0 };
      }

      const error = Math.abs(
        (interaction.totalDuration || 0) - (interaction.predictedDuration || 0)
      );
      const accuracy = interaction.totalDuration
        ? Math.max(0, Math.min(100, (1 - error / interaction.totalDuration) * 100))
        : 0;

      weeklyData[weekKey].errors.push(accuracy);
      weeklyData[weekKey].count++;
    });

    // Format for chart
    const data = Object.entries(weeklyData)
      .map(([week, stats]) => ({
        week: `Week of ${new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        period: week,
        accuracy: stats.errors.length > 0
          ? Math.round(stats.errors.reduce((a, b) => a + b, 0) / stats.errors.length)
          : 0,
        sampleSize: stats.count
      }))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

    // Calculate overall accuracy
    const allAccuracies = Object.values(weeklyData).flatMap(w => w.errors);
    const overallAccuracy = allAccuracies.length > 0
      ? Math.round(allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length)
      : 0;

    res.json({
      success: true,
      data,  // ✅ Return weekly time series array directly
      meta: {
        overallAccuracy,
        totalSamples: interactions.length,
        period: `${days} days`,
      }
    });
  }
);
}
