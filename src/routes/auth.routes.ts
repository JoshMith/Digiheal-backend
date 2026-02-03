import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate, authorize, requireAdmin } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

// router.post('/register', registrationLimiter, authController.register);

router.post('/register/patient', registrationLimiter, authController.registerPatient);
router.post('/register/staff', registrationLimiter, authController.registerStaff);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.put('/users/:userId/role', authenticate, requireAdmin, authController.changeUserRole);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.delete('/account', authenticate, authController.deactivateAccount);

export default router;