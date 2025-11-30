import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

interface MLPredictionRequest {
  symptoms: string[];
}

interface MLPredictionResponse {
  disease: string;
  severity_score: number;
  urgency: string;
  workouts: string[];
}

export class MLService {
  /**
   * Get disease prediction from ML model
   */
  async predictDisease(symptoms: string[]): Promise<MLPredictionResponse> {
    try {
      const response = await axios.post<MLPredictionResponse>(
        `${ML_API_URL}/predict`,
        { symptoms },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return response.data;
    } catch (error) {
      console.error('ML API Error:', error);
      throw new Error('Failed to get prediction from ML service');
    }
  }

  /**
   * Create and store health assessment
   */
  async createHealthAssessment(
    patientId: string,
    symptoms: string[],
    additionalInfo: any
  ) {
    // Get ML prediction
    const prediction = await this.predictDisease(symptoms);

    // Store in database
    const assessment = await prisma.healthAssessment.create({
      data: {
        patientId,
        symptoms,
        predictedDisease: prediction.disease,
        severityScore: prediction.severity_score,
        urgency: prediction.urgency,
        recommendations: prediction.workouts,
        additionalInfo,
        assessmentDate: new Date()
      }
    });

    // Create notification based on urgency
    if (prediction.urgency === 'Urgent') {
      await this.createUrgentNotification(patientId, prediction);
    }

    return {
      assessment,
      prediction
    };
  }

  private async createUrgentNotification(patientId: string, prediction: any) {
    await prisma.notification.create({
      data: {
        patientId,
        type: 'URGENT_HEALTH_ALERT',
        title: 'Urgent Medical Attention Required',
        message: `Your health assessment indicates ${prediction.disease} with high severity. Please seek immediate medical care.`,
        priority: 'HIGH',
        read: false
      }
    });
  }
}