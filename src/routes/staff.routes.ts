import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authenticate, requireAdmin, requireRole, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.get('/', requireStaffOrAdmin, StaffController.getAllStaff);
router.get('/:id', requireStaffOrAdmin, StaffController.getStaffById);
router.get('/:id/schedule', requireStaffOrAdmin, StaffController.getStaffSchedule);
router.get('/:id/stats', requireStaffOrAdmin, StaffController.getStaffStats);
router.get('/:id/availability', requireStaffOrAdmin, StaffController.getStaffAvailability);
router.post('/', requireAdmin, StaffController.createStaff);
router.put('/:id', requireAdmin, StaffController.updateStaff);
router.patch('/:id/availability', requireStaffOrAdmin, StaffController.updateStaffAvailability);

export default router;