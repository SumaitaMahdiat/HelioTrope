// routes/authRoutes.js
import { Router } from 'express';
import {
  register,
  registerSeller,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  resendResetOTP,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register); // buyer
router.post('/register-seller', registerSeller); // seller

router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

router.post('/login', login);

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);
router.post('/resend-reset-otp', resendResetOTP);

router.get('/me', protect, getMe);

export default router;