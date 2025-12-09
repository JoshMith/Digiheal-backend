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
} from '../utils/validators';

export class AuthController {
  /**
   * Register a new patient
   * @route POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = validate(patientRegistrationSchema, req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Check if student ID already exists
    const existingStudent = await prisma.patient.findUnique({
      where: { studentId: validatedData.studentId },
    });

    if (existingStudent) {
      throw new ApiError(409, 'Student ID already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create user and patient in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          passwordHash,
          role: 'PATIENT',
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          studentId: validatedData.studentId,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          dateOfBirth: new Date(validatedData.dateOfBirth),
          gender: validatedData.gender,
          phone: validatedData.phone,
          nationality: validatedData.nationality,
          address: validatedData.address,
          bloodGroup: validatedData.bloodGroup,
          emergencyContactName: validatedData.emergencyContactName,
          emergencyContactRelationship:
            validatedData.emergencyContactRelationship,
          emergencyContactPhone: validatedData.emergencyContactPhone,
          emergencyContactEmail: validatedData.emergencyContactEmail,
          insuranceProvider: validatedData.insuranceProvider,
          policyNumber: validatedData.policyNumber,
          allergies: validatedData.allergies || [],
          chronicConditions: validatedData.chronicConditions || [],
          currentMedications: validatedData.currentMedications || [],
        },
      });

      return { user, patient };
    });

    // Generate tokens
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    logger.info(`New patient registered: ${result.patient.studentId}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
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
   * Login user
   * @route POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = validate(loginSchema, req.body);

    // Find user
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
    const isPasswordValid = await comparePassword(password, user.passwordHash);

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
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile: user.patient || user.staff,
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
      where: { id: req.user.userId },
      include: {
        patient: true,
        staff: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        patient: true,
        staff: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * Logout (client-side token removal)
   * @route POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // In a more complex system, you might invalidate tokens here
    logger.info(`User logged out: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  });
}

export default new AuthController();