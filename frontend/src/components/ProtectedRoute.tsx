import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading, profileIncomplete } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-2" />
        <span>Authenticating session...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileIncomplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};
