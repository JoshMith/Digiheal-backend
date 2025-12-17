import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "./errorHandler";
import { JWTPayload, UserRole } from "../types";
import logger from "../utils/logger";

/**
 * Verify JWT token
 */
function verifyToken(token: string): JWTPayload {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw error;
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new ApiError(401, "No authorization token provided");
    }
    
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new ApiError(401, "Invalid authorization header format");
    }
    
    const token = parts[1];
    if (!token) {
      throw new ApiError(401, "Token is missing");
    }
    
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "Token has expired");
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, "Invalid token");
      }
      throw jwtError;
    }
  } catch (error) {
    next(error);
  }
};
/**
 * Middleware to check if user has required role(s)
 * @param roles - Array of allowed roles or single role
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }
      const userRole = req.user.role;
      if (!roles.includes(userRole)) {
        logger.warn(
          `Authorization failed: User ${req.user.email} with role ${userRole} attempted to access resource requiring ${roles.join(", ")}`
        );
        throw new ApiError(
          403,
          "You do not have permission to perform this action"
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Alias for authorize - use whichever you prefer
 */
export const requireRole = authorize;

/**
 * Simplified role-specific middleware factories
 */
export const requireAdmin = authorize(UserRole.ADMIN);
export const requireStaff = authorize(UserRole.STAFF);
export const requirePatient = authorize(UserRole.PATIENT);
export const requireStaffOrAdmin = authorize(UserRole.STAFF, UserRole.ADMIN);
export const requirePatientOrStaff = authorize(UserRole.PATIENT, UserRole.STAFF);
export const requireAnyAuthenticated = authenticate; // Just needs authentication

/**
 * Optional authentication - sets user if token exists but doesn't fail if missing
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no authorization header, continue without authentication
    if (!authHeader) {
      return next();
    }
    
    const parts = authHeader.split(" ");
    
    // If header format is invalid, continue without authentication
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return next();
    }
    
    const token = parts[1];
    
    // If token is empty, continue without authentication
    if (!token) {
      return next();
    }
    
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (jwtError) {
      // Token invalid or expired, but we don't fail - just continue without user
      logger.debug("Optional auth: Invalid or expired token provided");
      // Optionally set req.user = undefined or just leave it as is
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user owns the resource or is admin/staff
 * @param getResourceOwnerId - Function to extract owner ID from request
 */
export const authorizeOwnerOrStaff = (
  getResourceOwnerId: (req: Request) => string | Promise<string>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }

      // Staff and Admin can access any resource
      if (req.user.role === "STAFF" || req.user.role === "ADMIN") {
        return next();
      }

      // For patients, check if they own the resource
      const ownerId = await getResourceOwnerId(req);

      if (req.user.userId !== ownerId) {
        throw new ApiError(
          403,
          "You do not have permission to access this resource"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiting by user - tracks requests per user
 */
const userRequestCounts = new Map<
  string,
  { count: number; resetTime: number }
>();

export const userRateLimit = (
  maxRequests: number = 100,
  windowMs: number = 60000
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return next();
      }

      const userId = req.user.userId;
      const now = Date.now();
      const userRecord = userRequestCounts.get(userId);

      if (!userRecord || now > userRecord.resetTime) {
        userRequestCounts.set(userId, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }
      if (userRecord.count >= maxRequests) {
        throw new ApiError(429, "Too many requests. Please try again later.");
      }
      userRecord.count++;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  authenticate,
  authorize,
  requireRole,
  requireAdmin,
  requireStaff,
  requirePatient,
  requireStaffOrAdmin,
  requirePatientOrStaff,
  requireAnyAuthenticated,
  optionalAuth,
  authorizeOwnerOrStaff,
  userRateLimit,
};