import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleRouteGuardProps {
  allowedRoles: Array<'learner' | 'trainer' | 'admin'>;
  children: React.ReactNode;
}

export const RoleRouteGuard: React.FC<RoleRouteGuardProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-2" />
        <span>Verifying authorizations...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
