import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PermissionKey, UserRoleType } from '../../types';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: PermissionKey;
  role?: UserRoleType;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  role,
  fallback = null,
}) => {
  const { hasPermission, hasRole } = useAuth();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
