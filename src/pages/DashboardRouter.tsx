import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;

  if (user.role === 'buyer') return <Navigate to="/buyer/dashboard" replace />;
  if (user.role === 'seller') return <Navigate to="/seller/dashboard" replace />;
  if (user.role === 'delivery') return <Navigate to="/delivery/dashboard" replace />;
  if (user.role === 'employee' || user.role === 'admin') {
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};

export default DashboardRouter;