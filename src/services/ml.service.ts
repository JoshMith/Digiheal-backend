import axios from 'axios';
import logger from '../utils/logger';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

export interface PredictionRequest {
  department: string;
  priority: string;
  appointmentType: string;
  symptomCount?: number;
  timeOfDay?: number;
  dayOfWeek?: number;
}

export interface PredictionResponse {
  predictedDuration: number;
  confidence: number;
  modelVersion: string;
  modelType?: string;  // Added: 'ml-trained' or 'heuristic'
  error?: string;      // Added: error message if any
}

export interface ModelInfo {
  modelType: string;
  modelVersion: string;
  performance: {
    mae: number;
    r2: number;
  };
  trainingSamples: number;
  requiresDayOfWeek: boolean;
  suggestedRetraining: boolean;
}

export interface HealthStatus {
  status: string;
  model: string;
  modelType: string;
  timestamp: string;
}

/**
 * Predict consultation duration using ML service
 */
export const predictDuration = async (data: PredictionRequest): Promise<PredictionResponse> => {
  try {
    // Add current time if not provided
    const now = new Date();
    const requestData = {
      ...data,
      symptomCount: data.symptomCount || 1,
      timeOfDay: data.timeOfDay ?? now.getHours(),
      dayOfWeek: data.dayOfWeek ?? now.getDay()
    };

    // Validate required fields
    if (!requestData.department || !requestData.priority || !requestData.appointmentType) {
      logger.warn('Missing required fields for prediction, using heuristic');
      return getSimpleFallbackPrediction(requestData);
    }

    // Call ML service
    const response = await axios.post<PredictionResponse>(
      `${ML_SERVICE_URL}/predict`,
      requestData,
      {
        timeout: 5000, // 5 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info(`ML prediction: ${response.data.predictedDuration}min (${response.data.confidence} confidence)`);
    return response.data;
    
  } catch (error: any) {
    logger.error('ML service prediction error:', {
      error: error.message,
      endpoint: `${ML_SERVICE_URL}/predict`,
      data
    });
    
    // Check if ML service is down
    if (error.code === 'ECONNREFUSED' || error.response?.status === 503) {
      logger.warn('ML service unavailable, check if it\'s running on port 5000');
    }
    
    return getSimpleFallbackPrediction(data);
  }
};

/**
 * Simple fallback when ML service is completely down
 * Note: This should match the heuristic in app.py for consistency
 */
const getSimpleFallbackPrediction = (data: PredictionRequest): PredictionResponse => {
  // Base times by department (should match app.py heuristic)
  const baseTimes: Record<string, number> = {
    'GENERAL_MEDICINE': 15,
    'EMERGENCY': 25,
    'PEDIATRICS': 20,
    'MENTAL_HEALTH': 45,
    'DENTAL': 30,
    'PHARMACY': 10,
    'LABORATORY': 15
  };
  
  const base = baseTimes[data.department] || 15;
  
  // Priority multipliers (should match app.py)
  const priorityMult: Record<string, number> = {
    'LOW': 0.8,
    'NORMAL': 1.0,
    'HIGH': 1.5,
    'URGENT': 2.0
  };
  
  const mult = priorityMult[data.priority] || 1.0;
  
  // Symptom complexity
  const symptomTime = (data.symptomCount || 1) * 2.5;
  
  // Time of day adjustments
  const hour = data.timeOfDay || new Date().getHours();
  let timeMult = 1.0;
  if (8 <= hour && hour <= 11) {
    timeMult = 0.9;  // Morning efficiency
  } else if (12 <= hour && hour <= 14) {
    timeMult = 1.1;  // Lunch slowdown
  }
  
  let predicted = Math.round(base * mult * timeMult + symptomTime);
  
  // Clamp to reasonable bounds (5-120 minutes)
  predicted = Math.max(5, Math.min(predicted, 120));
  
  logger.warn(`Using fallback heuristic prediction: ${predicted}min`);
  
  return {
    predictedDuration: predicted,
    confidence: 0.65, // Match app.py heuristic confidence
    modelVersion: 'v0.1-heuristic',
    modelType: 'heuristic-fallback',
    error: 'ML service unavailable, using heuristic'
  };
};

/**
 * Get ML service model information
 */
export const getModelInfo = async (): Promise<ModelInfo | null> => {
  try {
    const response = await axios.get<ModelInfo>(`${ML_SERVICE_URL}/model-info`, {
      timeout: 3000
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to get model info:', error);
    return null;
  }
};

/**
 * Check ML service health
 */
export const checkHealth = async (): Promise<HealthStatus | null> => {
  try {
    const response = await axios.get<HealthStatus>(`${ML_SERVICE_URL}/health`, {
      timeout: 3000
    });
    return response.data;
  } catch (error) {
    logger.error('ML service health check failed:', error);
    return null;
  }
};

/**
 * Test ML service connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const health = await checkHealth();
    return health?.status === 'healthy';
  } catch (error) {
    return false;
  }
};

/**
 * Export training data to ML service for retraining
 */
export const exportTrainingData = async (data: any[]): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/train`,
      { data },
      {
        timeout: 10000, // 10 second timeout for training data
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info('Training data exported to ML service:', {
      samples: data.length,
      response: response.data
    });
    
    return true;
  } catch (error: any) {
    logger.error('Failed to export training data:', {
      error: error.message,
      samples: data.length
    });
    return false;
  }
};

/**
 * Get prediction accuracy analytics (call this from your backend analytics)
 */
export const getPredictionAccuracy = async (): Promise<{
  overallAccuracy: number;
  departmentStats: Array<{
    department: string;
    avgAccuracy: number;
    sampleSize: number;
  }>;
  totalSamples: number;
}> => {
  // This should query your database to compare predictions vs actual durations
  // For now, return placeholder
  return {
    overallAccuracy: 0.72,
    totalSamples: 81,
    departmentStats: [
      { department: 'GENERAL_MEDICINE', avgAccuracy: 0.75, sampleSize: 40 },
      { department: 'EMERGENCY', avgAccuracy: 0.68, sampleSize: 20 },
      { department: 'MENTAL_HEALTH', avgAccuracy: 0.80, sampleSize: 21 }
    ]
  };
};