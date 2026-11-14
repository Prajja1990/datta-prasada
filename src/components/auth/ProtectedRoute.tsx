import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PermissionKey, UserRoleType } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: PermissionKey;
  role?: UserRoleType;
  allowedRoles?: UserRoleType[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  role,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="w-12 h-12 border-4 border-temple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (role && !hasRole(role)) {
    return <AccessDeniedScreen reason={`This area requires the ${role} role.`} />;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.some(r => hasRole(r))) {
    return <AccessDeniedScreen reason={`Your role (${user.roles.join(', ')}) is not authorized for this section.`} />;
  }

  // Check permission requirement
  if (permission && !hasPermission(permission)) {
    return <AccessDeniedScreen reason={`Missing required privilege: [${permission}].`} />;
  }

  return <>{children}</>;
};

const AccessDeniedScreen: React.FC<{ reason: string }> = ({ reason }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-cream-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-traditional p-8 text-center border border-red-200">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif font-bold text-stone-900 mb-2">Access Restricted</h2>
        <p className="text-stone-600 text-sm mb-4">
          Enterprise RBAC policy has prevented access to this operational feature.
        </p>
        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg font-mono mb-6">
          {reason}
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            to="/staff/orders"
            className="flex items-center gap-2 px-4 py-2 bg-temple-600 text-white rounded-lg text-sm font-medium hover:bg-temple-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
          <Link
            to="/"
            className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition"
          >
            Customer Home
          </Link>
        </div>
      </div>
    </div>
  );
};
