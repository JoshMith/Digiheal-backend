import axios from 'axios';
import logger from '../utils/logger';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

export interface PredictionRequest {
  department: string;
  priority: string;
  appointmentType: string;
  symptomCount: number;
  timeOfDay?: number;
  dayOfWeek?: number;
}

export interface PredictionResponse {
  predictedDuration: number;
  confidence: number;
  modelVersion: string;
}

export const predictDuration = async (data: PredictionRequest): Promise<PredictionResponse> => {
  try {
    // Add current time if not provided
    const now = new Date();
    const requestData = {
      ...data,
      timeOfDay: data.timeOfDay || now.getHours(),
      dayOfWeek: data.dayOfWeek || now.getDay()
    };

    // Try ML service, fallback to heuristic
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/predict`, requestData);
      return response.data;
    } catch (error) {
      logger.warn('ML service unavailable, using heuristic fallback');
      return getHeuristicPrediction(requestData);
    }
  } catch (error) {
    logger.error('Prediction error:', error);
    return getHeuristicPrediction(data);
  }
};

// Simple heuristic fallback
const getHeuristicPrediction = (data: PredictionRequest): PredictionResponse => {
  let baseTime = 15; // minutes
  
  // Department adjustments
  if (data.department.includes('EMERGENCY')) baseTime = 25;
  if (data.department.includes('MENTAL')) baseTime = 45;
  
  // Priority multipliers
  const priorityMultiplier = {
    'LOW': 0.7,
    'NORMAL': 1,
    'HIGH': 1.5,
    'URGENT': 2
  };
  
  const multiplier = priorityMultiplier[data.priority as keyof typeof priorityMultiplier] || 1;
  
  // Symptom complexity
  const symptomTime = data.symptomCount * 3;
  
  const predicted = Math.round(baseTime * multiplier + symptomTime);
  
  return {
    predictedDuration: predicted,
    confidence: 0.5, // Low confidence for heuristic
    modelVersion: 'v0.1-heuristic'
  };
};

// Export training data to ML service
export const exportTrainingData = async (data: any[]) => {
  try {
    await axios.post(`${ML_SERVICE_URL}/train`, { data });
    logger.info('Training data exported to ML service');
    return true;
  } catch (error) {
    logger.error('Failed to export training data:', error);
    return false;
  }
};