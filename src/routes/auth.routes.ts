import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new patient account
 *     description: Create a new patient account with complete profile information
 */
router.post('/register', registrationLimiter, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login to the system
 *     description: Authenticate user with email and password
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
 * /auth/change-password:
 *   put:
 *     tags: [Authentication]
 *     summary: Change user password
 *     description: Update the authenticated user's password
 *     security:
 *       - bearerAuth: []
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @swagger
 * /auth/change-role:
 *  put:
 *    tags: [Authentication]
 *   summary: Change user role
 *   description: Change the role of the authenticated user (Admin only)
 *   security:
 *    - bearerAuth: []
 *   parameters:
 *    - in: body
 *     name: role
 *    description: New role for the user (PATIENT, STAFF, ADMIN)
 *   required: true
 *   schema:
 *    type: object
 *   properties:
 *    role:
 *     type: string
 *    enum: [PATIENT, STAFF, ADMIN]
 *    example:
 *    role: STAFF
 * */
router.put('/change-role/:userId', authenticate, authController.changeUserRole);

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

export default router;