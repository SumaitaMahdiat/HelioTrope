import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

import {
  checkout,
  buyerOrders,
  sellerOrders,
  sellerDecision,
  assignDelivery,
  deliveryOrders,
  deliveryStatus,
  employeeOrders,
  buyerCancelOrder,
} from '../controllers/orderController.js';

const router = Router();

// buyer
router.post('/checkout', protect, authorizeRoles('buyer'), checkout);
router.get('/buyer', protect, authorizeRoles('buyer'), buyerOrders);

// IMPORTANT: match frontend service call
router.patch('/:orderId/buyer-cancel', protect, authorizeRoles('buyer'), buyerCancelOrder);

// seller
router.get('/seller', protect, authorizeRoles('seller'), sellerOrders);
router.put('/:orderId/seller-decision', protect, authorizeRoles('seller'), sellerDecision);

// employee/admin
router.get('/employee', protect, authorizeRoles('employee', 'admin'), employeeOrders);
router.put('/:orderId/assign-delivery', protect, authorizeRoles('employee', 'admin'), assignDelivery);

// delivery
router.get('/delivery', protect, authorizeRoles('delivery'), deliveryOrders);
router.put('/:orderId/delivery-status', protect, authorizeRoles('delivery'), deliveryStatus);

export default router;