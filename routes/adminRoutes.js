import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  listPendingSellers,
  approveSeller,
  createStaffUser,
  setBlockUser,
  deleteProductByAdmin,
  deleteUserByAdmin,
  sendOfferEmail,
  listLowRatedProducts,
  listAllUsers,
  listAllProducts,
} from '../controllers/adminController.js';

const router = Router();

// all routes require login + admin role
const adminOnly = [protect, authorizeRoles('admin')];

// seller approvals
router.get('/pending-sellers', ...adminOnly, listPendingSellers);
router.patch('/sellers/:userId/approve', ...adminOnly, approveSeller);

// Feature 1: create staff
router.post('/users', ...adminOnly, createStaffUser);

// Feature 2: block/unblock
router.patch('/users/:userId/block', ...adminOnly, setBlockUser);

// Feature 3: delete + list
router.get('/users', ...adminOnly, listAllUsers);
router.delete('/users/:userId', ...adminOnly, deleteUserByAdmin);
router.get('/products', ...adminOnly, listAllProducts);
router.delete('/products/:productId', ...adminOnly, deleteProductByAdmin);

// Feature 4: send offer email
router.post('/offers/email', ...adminOnly, sendOfferEmail);

// Feature 5: low rating alerts
router.get('/alerts/low-rated', ...adminOnly, listLowRatedProducts);

export default router;