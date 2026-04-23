import api from './api';

export type LoginPayload = { email: string; password: string };

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type VerifyOTPPayload = { email: string; otp: string };

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  newPassword: string;
};

export const loginRequest = async (data: LoginPayload) => {
  const res = await api.post('/auth/login', data);
  return res.data;
};

// buyer signup
export const registerRequest = async (data: RegisterPayload) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};

// seller signup
export const registerSellerRequest = async (data: RegisterPayload) => {
  const res = await api.post('/auth/register-seller', data);
  return res.data;
};

export const verifyOTPRequest = async (data: VerifyOTPPayload) => {
  const res = await api.post('/auth/verify-otp', data);
  return res.data;
};

export const resendOTPRequest = async (email: string) => {
  const res = await api.post('/auth/resend-otp', { email });
  return res.data;
};

export const forgotPasswordRequest = async (email: string) => {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
};

export const verifyResetOTPRequest = async (data: VerifyOTPPayload) => {
  const res = await api.post('/auth/verify-reset-otp', data);
  return res.data;
};

export const resetPasswordRequest = async (data: ResetPasswordPayload) => {
  const res = await api.post('/auth/reset-password', data);
  return res.data;
};

export const resendResetOTPRequest = async (email: string) => {
  const res = await api.post('/auth/resend-reset-otp', { email });
  return res.data;
};