import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT token generation
export interface JWTPayload {
  userId: string | number;
  email: string;
  role: string;
}

export const generateToken = (payload: JWTPayload): string => {
  const secret = config.jwt.secret;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  const expiresIn = config.jwt.expiresIn || '24h';
  
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret = config.jwt.secret;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  const expiresIn = config.jwt.refreshExpiresIn || '7d';
  
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = config.jwt.secret;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  return jwt.verify(token, secret) as JWTPayload;
};
// Date formatting
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] || '';
};

export const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Pagination helpers
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const paginate = <T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> => {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
};

export const getPaginationParams = (
  page?: string | number,
  limit?: string | number
): PaginationParams => {
  const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page || 1;
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit || 10;
  
  return {
    page: Math.max(1, parsedPage),
    limit: Math.min(100, Math.max(1, parsedLimit)),
  };
};

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const generateCode = (length: number = 6): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// BMI calculation
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
};

// Time utilities
export const parseTime = (timeString: string): { hours: number; minutes: number } => {
  const parts = timeString.split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  return { hours, minutes };
};

export const formatTime = (hours: number, minutes: number): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const addMinutes = (timeString: string, minutesToAdd: number): string => {
  const { hours, minutes } = parseTime(timeString);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return formatTime(newHours, newMinutes);
};

// Queue number generation
export const generateQueueNumber = (date: Date, sequence: number): string => {
  const dateStr = formatDate(date).replace(/-/g, '');
  return `Q${dateStr}-${sequence.toString().padStart(3, '0')}`;
};

// File upload helpers
export const getAllowedFileTypes = (category: string): string[] => {
  const fileTypes: Record<string, string[]> = {
    medical_records: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    lab_results: ['.pdf', '.jpg', '.jpeg', '.png'],
    prescriptions: ['.pdf', '.jpg', '.jpeg', '.png'],
    imaging: ['.jpg', '.jpeg', '.png', '.dcm'],
  };
  return fileTypes[category] ?? fileTypes.medical_records ?? [];
};

export const isValidFileType = (filename: string, allowedTypes: string[]): boolean => {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return allowedTypes.includes(ext);
};

// Error message sanitization
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'An unexpected error occurred';
};

// Object utilities
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

// Wait/delay utility
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Retry utility
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await wait(delayMs);
      }
    }
  }
  
  throw lastError!;
};