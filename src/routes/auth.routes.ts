import { Router } from 'express';
import {authController} from '../controllers/appointment.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();


/**
 * @swagger
 * /auth/register:
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
 *                 example: student@dkut.ac.ke
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123
 *               studentId:
 *                 type: string
 *                 pattern: '^DKUT/\d{4}/\d{5}$'
 *                 example: DKUT/2024/12345
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 2000-01-15
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: MALE
 *               phone:
 *                 type: string
 *                 pattern: '^(\+254|0)[17]\d{8}$'
 *                 example: +254712345678
 *               nationality:
 *                 type: string
 *                 example: Kenyan
 *               address:
 *                 type: string
 *                 example: Nyeri, Kenya
 *               bloodGroup:
 *                 type: string
 *                 enum: [A_POSITIVE, A_NEGATIVE, B_POSITIVE, B_NEGATIVE, AB_POSITIVE, AB_NEGATIVE, O_POSITIVE, O_NEGATIVE]
 *                 example: O_POSITIVE
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Penicillin, Peanuts]
 *               chronicConditions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Asthma]
 *               currentMedications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Ventolin Inhaler]
 *               emergencyContactName:
 *                 type: string
 *                 example: Jane Doe
 *               emergencyContactRelationship:
 *                 type: string
 *                 example: Mother
 *               emergencyContactPhone:
 *                 type: string
 *                 example: +254722334455
 *               emergencyContactEmail:
 *                 type: string
 *                 format: email
 *                 example: jane.doe@example.com
 *               insuranceProvider:
 *                 type: string
 *                 example: NHIF
 *               policyNumber:
 *                 type: string
 *                 example: NHIF123456
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                     patient:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         studentId:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', authLimiter, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login to the system
 *     description: Authenticate user with email and password
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
 *                 example: student@dkut.ac.ke
 *               password:
 *                 type: string
 *                 format: password
 *                 example: patient123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [PATIENT, STAFF, ADMIN]
 *                     profile:
 *                       type: object
 *                       description: Patient or Staff profile based on role
 *                     token:
 *                       type: string
 *                       description: JWT access token (expires in 7 days)
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token (expires in 30 days)
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
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
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     patient:
 *                       type: object
 *                       description: Patient profile (if role is PATIENT)
 *                     staff:
 *                       type: object
 *                       description: Staff profile (if role is STAFF)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 */
router.get('/me', authenticate, authController.getProfile);

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
 *                 format: password
 *                 description: Current password
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password (min 8 chars, must contain uppercase, lowercase, and number)
 *                 example: NewSecurePass456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Validation error or missing fields
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: User not found
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Logout the current user (client should discard tokens)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 */
router.post('/logout', authenticate, authController.logout);

export default router;