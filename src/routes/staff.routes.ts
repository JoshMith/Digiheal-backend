import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authenticate, requireAdmin, requireRole, requireStaffOrAdmin } from '../middleware/auth';

const router: Router = Router();

router.use(authenticate);
router.use(requireStaffOrAdmin);

router.post('/', requireAdmin, StaffController.createStaff);
router.get('/', StaffController.getAllStaff);
router.get('/:id', StaffController.getStaffById);
router.put('/:id', StaffController.updateStaff);
router.get('/:id/schedule', StaffController.getStaffSchedule);
router.get('/:id/stats', StaffController.getStaffStats);

export default router;