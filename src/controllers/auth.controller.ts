import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
} from '../utils/helpers';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import {
  validate,
  loginSchema,
  patientRegistrationSchema,
  staffRegistrationSchema,
} from '../utils/validators';
import { UserRole } from '../types';

export class AuthController {
  /**
   * Register a new patient
   * @route POST /api/v1/auth/register/patient
   */
  registerPatient = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = validate(patientRegistrationSchema, req.body);

    // Type assertion to fix TypeScript errors
    const data = validatedData as {
      email: string;
      password: string;
      studentId: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: 'MALE' | 'FEMALE' | 'OTHER';
      phone: string;
      nationality?: string;
      address?: string;
      bloodGroup?: string;
      emergencyContactName?: string;
      emergencyContactRelationship?: string;
      emergencyContactPhone?: string;
      emergencyContactEmail?: string;
      insuranceProvider?: string;
      policyNumber?: string;
      allergies?: string[];
      chronicConditions?: string[];
      currentMedications?: string[];
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Check if student ID already exists
    const existingStudent = await prisma.patient.findUnique({
      where: { studentId: data.studentId },
    });

    if (existingStudent) {
      throw new ApiError(409, 'Student ID already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user and patient in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: 'PATIENT',
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          studentId: data.studentId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          phone: data.phone,
          bloodGroup: data.bloodGroup ?? null,
          emergencyContactName: data.emergencyContactName ?? null,
          emergencyContactPhone: data.emergencyContactPhone ?? null,
          allergies: data.allergies || [],
          chronicConditions: data.chronicConditions || [],
        },
      });

      return { user, patient };
    });

    // Generate tokens
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
    });

    logger.info(`New patient registered: ${result.patient.studentId}`);

    res.status(201).json({
      success: true,
      message: 'Patient registration successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        patient: {
          id: result.patient.id,
          studentId: result.patient.studentId,
          firstName: result.patient.firstName,
          lastName: result.patient.lastName,
        },
        token,
        refreshToken,
      },
    });
  });

  /**
   * Register a new staff member
   * @route POST /api/v1/auth/register/staff
   */
  registerStaff = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = validate(staffRegistrationSchema, req.body);

    // Type assertion
    const data = validatedData as {
      email: string;
      password: string;
      staffId: string;
      firstName: string;
      lastName: string;
      department: string;
      position: string;
      phone: string;
      specialization?: string;
      licenseNumber?: string;
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Check if staff ID already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { staffId: data.staffId },
    });

    if (existingStaff) {
      throw new ApiError(409, 'Staff ID already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user and staff in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: 'STAFF',
          isActive: true,
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          staffId: data.staffId,
          firstName: data.firstName,
          lastName: data.lastName,
          department: data.department as any,
          position: data.position as any,
          phone: data.phone,
          specialization: data.specialization ?? null,
          licenseNumber: data.licenseNumber ?? null,
        },
      });

      return { user, staff };
    });

    // Generate tokens
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
    });

    logger.info(`New staff registered: ${result.staff.staffId}`);

    res.status(201).json({
      success: true,
      message: 'Staff registration successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        staff: {
          id: result.staff.id,
          staffId: result.staff.staffId,
          firstName: result.staff.firstName,
          lastName: result.staff.lastName,
          department: result.staff.department,
          position: result.staff.position,
        },
        token,
        refreshToken,
      },
    });
  });

  /**
   * Login user (both patient and staff)
   * @route POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = validate(loginSchema, req.body) as {
      email: string;
      password: string;
    };

    // Find user with their profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        patient: true,
        staff: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    logger.info(`User logged in: ${user.email} (${user.role})`);

    // Determine profile based on role
    const profile = user.role === 'PATIENT' ? user.patient : user.staff;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile,
        token,
        refreshToken,
      },
    });
  });

  /**
   * Get current user profile
   * @route GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: String(req.user.userId) },
      include: {
        patient: true,
        staff: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Remove sensitive data
    const { password, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        ...safeUser,
        profile: user.role === 'PATIENT' ? user.patient : user.staff,
      },
    });
  });

  /**
   * Update current user profile
   * @route PUT /api/v1/auth/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: String(req.user.userId) },
      include: {
        patient: true,
        staff: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update based on role
    if (user.role === 'PATIENT' && user.patient) {
      const {
        firstName,
        lastName,
        phone,
        bloodGroup,
        emergencyContactName,
        emergencyContactPhone,
        allergies,
        chronicConditions,
      } = req.body;

      const updatedPatient = await prisma.patient.update({
        where: { id: user.patient.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
          ...(bloodGroup !== undefined && { bloodGroup: bloodGroup ?? null }),
          ...(emergencyContactName !== undefined && { 
            emergencyContactName: emergencyContactName ?? null 
          }),
          ...(emergencyContactPhone !== undefined && { 
            emergencyContactPhone: emergencyContactPhone ?? null 
          }),
          ...(allergies && { allergies }),
          ...(chronicConditions && { chronicConditions }),
        },
      });

      logger.info(`Patient profile updated: ${updatedPatient.studentId}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedPatient,
      });
    } else if ((user.role === 'STAFF' || user.role === 'ADMIN') && user.staff) {
      const {
        firstName,
        lastName,
        phone,
        specialization,
        licenseNumber,
        isAvailable,
      } = req.body;

      const updatedStaff = await prisma.staff.update({
        where: { id: user.staff.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
          ...(specialization !== undefined && { 
            specialization: specialization ?? null 
          }),
          ...(licenseNumber !== undefined && { 
            licenseNumber: licenseNumber ?? null 
          }),
          ...(isAvailable !== undefined && { isAvailable }),
        },
      });

      logger.info(`Staff profile updated: ${updatedStaff.staffId}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedStaff,
      });
    } else {
      throw new ApiError(400, 'Unable to update profile');
    }
  });

  /**
   * Change password
   * @route PUT /api/v1/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Current and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, 'New password must be at least 8 characters long');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: String(req.user.userId) },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * Change user role (Admin only)
   * @route PUT /api/v1/auth/users/:userId/role
   */
  changeUserRole = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: String(req.user.userId) },
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      throw new ApiError(403, 'Only admins can change user roles');
    }

    const { userId } = req.params;
    const { newRole } = req.body;

    // Validate role
    const validRoles = ['PATIENT', 'STAFF', 'ADMIN'];
    if (!newRole || !validRoles.includes(newRole)) {
      throw new ApiError(400, 'Valid new role is required (PATIENT, STAFF, ADMIN)');
    }

    // Find target user
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Prevent changing own role
    if (user.id === currentUser.id) {
      throw new ApiError(400, 'Cannot change your own role');
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: String(userId) },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    logger.info(`Role changed for user: ${user.email} from ${user.role} to ${newRole} by admin ${currentUser.email}`);

    res.json({
      success: true,
      message: 'User role changed successfully',
      data: updatedUser,
    });
  });

  /**
   * Refresh access token
   * @route POST /api/v1/auth/refresh-token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw new ApiError(401, 'Invalid refresh token');
      }

      const newToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  });

  /**
   * Logout (client-side token removal)
   * @route POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    logger.info(`User logged out: ${req.user?.email}`);
    res.json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Deactivate account (soft delete)
   * @route DELETE /api/v1/auth/account
   */
  deactivateAccount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { password } = req.body;

    if (!password) {
      throw new ApiError(400, 'Password is required to deactivate account');
    }

    const user = await prisma.user.findUnique({
      where: { id: String(req.user.userId) },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid password');
    }

    // Deactivate account
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    logger.info(`Account deactivated: ${user.email}`);

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  });
}

export default new AuthController();