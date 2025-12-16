import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import logger from '../utils/logger';

/**
 * Rate limiter for general API endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: false,
  message: 'Too many authentication attempts, please try again later.',
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
  },
});

// Stricter limiter for patient registration
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: {
    error: 'Too many registration attempts from this IP, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Lenient limiter for general health checks
export const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 health checks per minute
  message: {
    error: 'Too many health check requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for file upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: 'Too many file uploads, please try again later.',
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Upload limit reached. Please try again in an hour.',
    });
  },
});

/**
 * Rate limiter for health assessment/ML prediction endpoints
 */
export const mlLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 ML predictions per hour
  message: 'Too many health assessment requests.',
  handler: (req, res) => {
    logger.warn('ML rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Health assessment limit reached. Please try again later.',
    });
  },
});