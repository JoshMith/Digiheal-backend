import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate, authorize, requireAdmin } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new patient account (legacy endpoint)
 *     description: Create a new patient account with complete profile information
 */
router.post('/register', registrationLimiter, authController.register);

/**
 * @swagger
 * /auth/register/patient:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new patient account
 *     description: Create a new patient account with complete profile information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - studentId
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *               - gender
 *               - phone
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               studentId:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *               phone:
 *                 type: string
 */
router.post('/register/patient', registrationLimiter, authController.registerPatient);

/**
 * @swagger
 * /auth/register/staff:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new staff account
 *     description: Create a new staff member account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - staffId
 *               - firstName
 *               - lastName
 *               - department
 *               - position
 *               - phone
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               staffId:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               department:
 *                 type: string
 *                 enum: [GENERAL_MEDICINE, EMERGENCY, PEDIATRICS, MENTAL_HEALTH, DENTAL, OPHTHALMOLOGY, PHARMACY, LABORATORY, RADIOLOGY, NURSING, ADMINISTRATION, CARDIOLOGY, DERMATOLOGY, ORTHOPEDICS, GYNECOLOGY]
 *               position:
 *                 type: string
 *                 enum: [DOCTOR, NURSE, PHARMACIST, LAB_TECHNICIAN, RADIOLOGIST, ADMINISTRATOR, RECEPTIONIST, SPECIALIST, CONSULTANT, INTERN]
 *               phone:
 *                 type: string
 *               specialization:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 */
router.post('/register/staff', registrationLimiter, authController.registerStaff);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login to the system
 *     description: Authenticate user with email and password (works for both patients and staff)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 */
router.post('/login', authLimiter, authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     tags: [Authentication]
 *     summary: Change user password
 *     description: Update the authenticated user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @swagger
 * /auth/users/{userId}/role:
 *   put:
 *     tags: [Authentication]
 *     summary: Change user role (Admin only)
 *     description: Change the role of a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newRole
 *             properties:
 *               newRole:
 *                 type: string
 *                 enum: [PATIENT, STAFF, ADMIN]
 */
router.put('/users/:userId/role', authenticate, requireAdmin, authController.changeUserRole);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Logout the current user (client should discard tokens)
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /auth/account:
 *   delete:
 *     tags: [Authentication]
 *     summary: Deactivate account
 *     description: Soft delete (deactivate) the current user's account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 */
router.delete('/account', authenticate, authController.deactivateAccount);

export default router;