import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { uploadProductImages } from '../utils/upload.js';
import { requireVerifiedSeller } from '../middleware/verifiedSellerMiddleware.js';

import {
  listProducts,
  getProduct,
  createProduct,
  listMySellerProducts,
} from '../controllers/productController.js';

const router = Router();

router.get('/', listProducts);
router.get('/my', protect, authorizeRoles('seller'), listMySellerProducts);

router.get('/:id', getProduct);

router.post(
  '/',
  protect,
  authorizeRoles('seller'),
  requireVerifiedSeller,
  uploadProductImages.array('images', 6),
  createProduct
);

export default router;