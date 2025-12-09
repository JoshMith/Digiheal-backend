import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class PatientService {
  static async findByEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          patient: true,
        },
      });
      return user;
    } catch (error) {
      logger.error('Error finding patient by email:', error);
      throw error;
    }
  }

  static async findByStudentId(studentId: string) {
    try {
      return await prisma.patient.findUnique({
        where: { studentId },
        include: {
          user: true,
        },
      });
    } catch (error) {
      logger.error('Error finding patient by student ID:', error);
      throw error;
    }
  }

  static async updateProfile(patientId: string, data: any) {
    try {
      return await prisma.patient.update({
        where: { id: patientId },
        data,
      });
    } catch (error) {
      logger.error('Error updating patient profile:', error);
      throw error;
    }
  }

  static async getHealthSummary(patientId: string) {
    try {
      const [latestAssessment, recentAppointments, activePrescriptions] = await Promise.all([
        prisma.healthAssessment.findFirst({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.appointment.findMany({
          where: { patientId },
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
        }),
        prisma.prescription.findMany({
          where: {
            patientId,
            status: 'ACTIVE',
          },
          include: {
            consultation: {
              include: {
                staff: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        latestAssessment,
        recentAppointments,
        activePrescriptions,
      };
    } catch (error) {
      logger.error('Error fetching health summary:', error);
      throw error;
    }
  }
}