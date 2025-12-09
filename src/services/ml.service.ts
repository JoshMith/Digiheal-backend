import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import logger from '../utils/logger';
import { UrgencyLevel, Priority } from '@prisma/client';
import prisma from '../config/database';
import { cacheService } from '../config/redis';

interface MLPredictionRequest {
  symptoms: string[];
  age?: number;
  gender?: string;
  duration?: string;
  severity?: string;
}

interface MLPredictionResponse {
  disease: string;
  severity_score: number;
  urgency: 'LOW' | 'MODERATE' | 'URGENT';
  recommendations: string[];
  confidence?: number;
}

export class MLService {
  private client: AxiosInstance;
  private cacheEnabled: boolean;
  private cacheTTL: number = 3600; // 1 hour

  constructor() {
    this.client = axios.create({
      baseURL: config.mlService.url,
      timeout: config.mlService.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.cacheEnabled = config.redis.enabled;

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`ML API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('ML API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`ML API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('ML API Response Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get disease prediction from ML model
   */
  async predictDisease(
    data: MLPredictionRequest
  ): Promise<MLPredictionResponse> {
    try {
      // Check cache first
      const cacheKey = `ml:prediction:${JSON.stringify(data)}`;
      if (this.cacheEnabled) {
        const cached = await cacheService.get<MLPredictionResponse>(cacheKey);
        if (cached) {
          logger.info('ML prediction retrieved from cache');
          return cached;
        }
      }

      // Make prediction request
      const response = await this.client.post<MLPredictionResponse>(
        '/predict',
        data
      );

      // Cache the result
      if (this.cacheEnabled && response.data) {
        await cacheService.set(cacheKey, response.data, this.cacheTTL);
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('ML service is not available. Please try again later.');
      }
      if (error.response) {
        throw new Error(
          `ML service error: ${error.response.data?.message || error.response.statusText}`
        );
      }
      throw new Error('Failed to get prediction from ML service');
    }
  }

  /**
   * Create health assessment with ML prediction
   */
  async createHealthAssessment(
    patientId: string,
    symptoms: string[],
    additionalInfo?: {
      age?: number;
      gender?: string;
      duration?: string;
      severity?: string;
      notes?: string;
    }
  ) {
    try {
      // Get ML prediction
      const prediction = await this.predictDisease({
        symptoms,
        age: additionalInfo?.age,
        gender: additionalInfo?.gender,
        duration: additionalInfo?.duration,
        severity: additionalInfo?.severity,
      });

      // Create health assessment record
      const assessment = await prisma.healthAssessment.create({
        data: {
          patientId,
          symptoms,
          additionalInfo: additionalInfo || {},
          predictedDisease: prediction.disease,
          severityScore: prediction.severity_score,
          urgency: prediction.urgency as UrgencyLevel,
          recommendations: prediction.recommendations,
          confidence: prediction.confidence,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
        },
      });

      // Create urgent notification if needed
      if (prediction.urgency === 'URGENT') {
        await prisma.notification.create({
          data: {
            patientId,
            type: 'URGENT_HEALTH_ALERT',
            title: 'Urgent Health Assessment',
            message: `Your health assessment indicates ${prediction.disease}. Please seek immediate medical attention.`,
            priority: Priority.URGENT,
          },
        });

        logger.warn(`Urgent health assessment created for patient ${patientId}`);
      }

      logger.info(`Health assessment created: ${assessment.id} for patient ${patientId}`);

      return assessment;
    } catch (error: any) {
      logger.error('Error creating health assessment:', error);
      throw error;
    }
  }

  /**
   * Get model health status
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        message: 'ML service is operational',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'ML service is not responding',
      };
    }
  }

  /**
   * Get model metadata/info
   */
  async getModelInfo(): Promise<any> {
    try {
      const response = await this.client.get('/info');
      return response.data;
    } catch (error) {
      logger.error('Error getting model info:', error);
      throw new Error('Failed to retrieve model information');
    }
  }

  /**
   * Batch predictions (if needed for analytics)
   */
  async batchPredict(
    requests: MLPredictionRequest[]
  ): Promise<MLPredictionResponse[]> {
    try {
      const predictions = await Promise.all(
        requests.map((req) => this.predictDisease(req))
      );
      return predictions;
    } catch (error) {
      logger.error('Error in batch prediction:', error);
      throw error;
    }
  }
}

export default new MLService();