import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authenticate, requireAdmin, requireRole, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Get all staff (staff and admin can view)
router.get('/', requireStaffOrAdmin, StaffController.getAllStaff);

// Get specific staff by ID (staff and admin can view)
router.get('/:id', requireStaffOrAdmin, StaffController.getStaffById);

// Get staff schedule (staff and admin can view)
router.get('/:id/schedule', requireStaffOrAdmin, StaffController.getStaffSchedule);

// Get staff statistics (staff and admin can view)
router.get('/:id/stats', requireStaffOrAdmin, StaffController.getStaffStats);

// Get staff availability (staff and admin can view)
router.get('/:id/availability', requireStaffOrAdmin, StaffController.getStaffAvailability);

// Create new staff (admin only)
router.post('/', requireAdmin, StaffController.createStaff);

// Update staff profile (admin only, or staff can update their own profile)
router.put('/:id', requireAdmin, StaffController.updateStaff);

// Update staff availability (staff can update their own, admin can update any)
router.patch('/:id/availability', requireStaffOrAdmin, StaffController.updateStaffAvailability);

export default router;