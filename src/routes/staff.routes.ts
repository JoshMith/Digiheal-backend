import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router: Router = Router();

router.use(authenticate);
router.use(requireRole(['STAFF', 'ADMIN']));

router.post('/', requireRole(['ADMIN']), StaffController.createStaff);
router.get('/', StaffController.getAllStaff);
router.get('/:id', StaffController.getStaffById);
router.put('/:id', StaffController.updateStaff);
router.patch('/:id/availability', StaffController.toggleAvailability);
router.get('/:id/schedule', StaffController.getStaffSchedule);
router.get('/:id/stats', StaffController.getStaffStats);

export default router;