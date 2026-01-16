import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

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
      completedAppointments
    ] = await Promise.all([
      // Total patients today
      prisma.interaction.count({
        where: {
          checkInTime: { gte: today }
        }
      }),
      
      // Average wait time (check-in to consultation start)
      prisma.interaction.aggregate({
        where: {
          vitalsDuration: { not: null }
        },
        _avg: {
          vitalsDuration: true
        }
      }),
      
      // Average interaction time
      prisma.interaction.aggregate({
        where: {
          interactionDuration: { not: null }
        },
        _avg: {
          interactionDuration: true
        }
      }),
      
      // Total appointments today
      prisma.appointment.count({
        where: {
          appointmentDate: today
        }
      }),
      
      // No-shows
      prisma.appointment.count({
        where: {
          appointmentDate: today,
          status: 'NO_SHOW'
        }
      }),
      
      // Completed appointments today
      prisma.appointment.count({
        where: {
          appointmentDate: today,
          status: 'COMPLETED'
        }
      })
    ]);
    
    // Calculate ML accuracy (simulated)
    const interactionsWithPredictions = await prisma.interaction.findMany({
      where: {
        predictedDuration: { not: null },
        totalDuration: { not: null }
      },
      select: {
        predictedDuration: true,
        totalDuration: true
      }
    });
    
    let mlAccuracy = 0;
    if (interactionsWithPredictions.length > 0) {
      const accuratePredictions = interactionsWithPredictions.filter(interaction => {
        const diff = Math.abs((interaction.totalDuration || 0) - (interaction.predictedDuration || 0));
        return diff <= 10; // Consider prediction accurate if within 10 minutes
      }).length;
      mlAccuracy = (accuratePredictions / interactionsWithPredictions.length) * 100;
    }
    
    res.json({
      success: true,
      data: {
        metrics: {
          totalPatientsToday,
          avgWaitTime: avgWaitTime._avg.vitalsDuration || 0,
          avgInteractionTime: avgInteractionTime._avg.interactionDuration || 0,
          totalAppointments,
          completedAppointments,
          noShowCount,
          noShowRate: totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0,
          completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
          mlAccuracy: Math.round(mlAccuracy * 100) / 100 // Round to 2 decimal places
        }
      }
    });
  });
  
  static getPatientFlow = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const patientCount = await prisma.interaction.count({
        where: {
          checkInTime: {
            gte: date,
            lte: endDate
          }
        }
      });
      
      const appointmentCount = await prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: date,
            lte: endDate
          }
        }
      });
      
      data.push({
        date: date.toISOString().split('T')[0],
        patients: patientCount,
        appointments: appointmentCount
      });
    }
    
    res.json({ 
      success: true, 
      data,
      period: `${days} days`
    });
  });
  
  static getWaitTimes = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      // Using Prisma's query builder instead of raw SQL
      const results = await prisma.interaction.groupBy({
        by: ['department'],
        where: {
          totalDuration: { not: null },
          checkInTime: { gte: startDate }
        },
        _avg: {
          vitalsDuration: true,
          interactionDuration: true,
          totalDuration: true
        },
        _count: true,
        orderBy: {
          department: 'asc'
        }
      });
      
      // Format the results
      const formattedResults = results.map(result => ({
        department: result.department,
        avgVitalsTime: result._avg.vitalsDuration || 0,
        avgConsultationTime: result._avg.interactionDuration || 0,
        avgTotalTime: result._avg.totalDuration || 0,
        sampleSize: result._count
      }));
      
      res.json({ 
        success: true, 
        data: formattedResults,
        period: `${days} days`
      });
    } catch (error) {
      // Fallback if groupBy doesn't work
      const interactions = await prisma.interaction.findMany({
        where: {
          totalDuration: { not: null },
          checkInTime: { gte: startDate }
        },
        select: {
          department: true,
          vitalsDuration: true,
          interactionDuration: true,
          totalDuration: true
        }
      });
      
      // Manual grouping
      const departmentStats: Record<string, any> = {};
      interactions.forEach(interaction => {
        const dept = interaction.department;
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            vitalsSum: 0,
            interactionSum: 0,
            totalSum: 0,
            count: 0
          };
        }
        
        departmentStats[dept].vitalsSum += interaction.vitalsDuration || 0;
        departmentStats[dept].interactionSum += interaction.interactionDuration || 0;
        departmentStats[dept].totalSum += interaction.totalDuration || 0;
        departmentStats[dept].count += 1;
      });
      
      const formattedResults = Object.entries(departmentStats).map(([department, stats]) => ({
        department,
        avgVitalsTime: stats.count > 0 ? Math.round(stats.vitalsSum / stats.count) : 0,
        avgConsultationTime: stats.count > 0 ? Math.round(stats.interactionSum / stats.count) : 0,
        avgTotalTime: stats.count > 0 ? Math.round(stats.totalSum / stats.count) : 0,
        sampleSize: stats.count
      }));
      
      res.json({ 
        success: true, 
        data: formattedResults,
        period: `${days} days`
      });
    }
  });
  
  static getDepartmentLoad = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get appointments by department
    const appointmentsByDept = await prisma.appointment.groupBy({
      by: ['department'],
      where: {
        appointmentDate: { gte: startDate }
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    // Get interactions by department
    const interactionsByDept = await prisma.interaction.groupBy({
      by: ['department'],
      where: {
        checkInTime: { gte: startDate }
      },
      _count: true
    });
    
    // Combine data
    const departmentMap = new Map();
    
    // Add appointments
    appointmentsByDept.forEach(dept => {
      departmentMap.set(dept.department, {
        department: dept.department,
        appointments: dept._count,
        interactions: 0,
        utilization: 0
      });
    });
    
    // Add interactions
    interactionsByDept.forEach(dept => {
      if (departmentMap.has(dept.department)) {
        const data = departmentMap.get(dept.department);
        data.interactions = dept._count;
        // Calculate utilization (interactions/appointments)
        data.utilization = data.appointments > 0 
          ? Math.round((dept._count / data.appointments) * 100) 
          : 0;
      } else {
        departmentMap.set(dept.department, {
          department: dept.department,
          appointments: 0,
          interactions: dept._count,
          utilization: 0
        });
      }
    });
    
    const data = Array.from(departmentMap.values());
    
    // Calculate total utilization
    const totalAppointments = data.reduce((sum, dept) => sum + dept.appointments, 0);
    const totalInteractions = data.reduce((sum, dept) => sum + dept.interactions, 0);
    const overallUtilization = totalAppointments > 0 
      ? Math.round((totalInteractions / totalAppointments) * 100) 
      : 0;
    
    res.json({
      success: true,
      data: {
        departments: data,
        summary: {
          totalAppointments,
          totalInteractions,
          overallUtilization,
          period: `${days} days`
        }
      }
    });
  });
  
  static getStaffPerformance = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get staff with their interaction counts and average durations
    const staffPerformance = await prisma.staff.findMany({
      where: {
        interactions: {
          some: {
            checkInTime: { gte: startDate }
          }
        }
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
                checkInTime: { gte: startDate }
              }
            }
          }
        },
        interactions: {
          where: {
            checkInTime: { gte: startDate }
          },
          select: {
            totalDuration: true,
            interactionDuration: true
          }
        }
      },
      take: limit,
      orderBy: {
        interactions: {
          _count: 'desc'
        }
      }
    });
    
    // Calculate averages
    const formattedPerformance = staffPerformance.map(staff => {
      const validInteractions = staff.interactions.filter(i => i.totalDuration !== null);
      const totalPatients = validInteractions.length;
      const totalDuration = validInteractions.reduce((sum, i) => sum + (i.totalDuration || 0), 0);
      const avgDuration = totalPatients > 0 ? Math.round(totalDuration / totalPatients) : 0;
      
      return {
        staffId: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        department: staff.department,
        position: staff.position,
        totalPatients: staff._count.interactions,
        avgDuration,
        efficiency: avgDuration > 0 ? Math.round(totalPatients * 60 / avgDuration) : 0 // patients per hour
      };
    });
    
    res.json({
      success: true,
      data: formattedPerformance,
      period: `${days} days`
    });
  });
  
  static getPredictionAccuracy = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const interactions = await prisma.interaction.findMany({
      where: {
        predictedDuration: { not: null },
        totalDuration: { not: null },
        checkInTime: { gte: startDate }
      },
      select: {
        predictedDuration: true,
        totalDuration: true,
        checkInTime: true,
        department: true
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });
    
    // Calculate accuracy metrics
    const accuracyData = interactions.map(interaction => {
      const error = Math.abs((interaction.totalDuration || 0) - (interaction.predictedDuration || 0));
      const accuracy = interaction.totalDuration 
        ? (1 - (error / interaction.totalDuration)) * 100 
        : 0;
      
      return {
        date: interaction.checkInTime.toISOString().split('T')[0],
        department: interaction.department,
        predicted: interaction.predictedDuration,
        actual: interaction.totalDuration,
        error,
        accuracy: Math.max(0, Math.min(100, accuracy)) // Clamp 0-100
      };
    });
    
    // Calculate overall accuracy
    const totalError = accuracyData.reduce((sum, item) => sum + item.error, 0);
    const totalActual = accuracyData.reduce((sum, item) => sum + (item.actual || 0), 0);
    const overallAccuracy = totalActual > 0 
      ? Math.max(0, Math.min(100, (1 - (totalError / totalActual)) * 100))
      : 0;
    
    // Group by department
    const departmentAccuracy: Record<string, any> = {};
    accuracyData.forEach(item => {
      const dept = item.department;
      if (!departmentAccuracy[dept]) {
        departmentAccuracy[dept] = {
          totalError: 0,
          totalActual: 0,
          count: 0
        };
      }
      departmentAccuracy[dept].totalError += item.error;
      departmentAccuracy[dept].totalActual += item.actual || 0;
      departmentAccuracy[dept].count += 1;
    });
    
    const departmentStats = Object.entries(departmentAccuracy).map(([department, stats]) => ({
      department,
      avgAccuracy: stats.totalActual > 0 
        ? Math.max(0, Math.min(100, (1 - (stats.totalError / stats.totalActual)) * 100))
        : 0,
      sampleSize: stats.count
    }));
    
    res.json({
      success: true,
      data: {
        overallAccuracy: Math.round(overallAccuracy * 100) / 100,
        totalSamples: accuracyData.length,
        departmentStats,
        dailyData: accuracyData.slice(0, 100), // Limit response size
        period: `${days} days`
      }
    });
  });
}