import { UserRoleType, PermissionKey, UserProfile } from '../types';
import { store } from './store';

export const ROLE_PERMISSIONS_MAP: Record<UserRoleType, PermissionKey[]> = {
  SUPER_ADMIN: [
    'dashboard.view',
    'orders.create',
    'orders.view_all',
    'orders.view_own',
    'orders.accept',
    'orders.prepare',
    'orders.mark_ready',
    'orders.complete',
    'orders.cancel',
    'menu.view',
    'menu.create',
    'menu.update',
    'menu.delete',
    'menu.manage_price',
    'users.view',
    'users.create',
    'users.update',
    'users.deactivate',
    'roles.assign',
    'roles.manage',
    'reports.view',
    'reports.export',
    'payments.view',
    'payments.verify',
    'payments.refund',
    'settings.manage',
    'audit_logs.view',
  ],
  ADMIN: [
    'dashboard.view',
    'orders.create',
    'orders.view_all',
    'orders.view_own',
    'orders.accept',
    'orders.prepare',
    'orders.mark_ready',
    'orders.complete',
    'orders.cancel',
    'menu.view',
    'menu.create',
    'menu.update',
    'menu.delete',
    'menu.manage_price',
    'users.view',
    'users.create',
    'users.update',
    'users.deactivate',
    'reports.view',
    'reports.export',
    'payments.view',
    'payments.verify',
    'payments.refund',
    'audit_logs.view',
  ],
  STAFF: [
    'dashboard.view',
    'orders.create',
    'orders.view_all',
    'orders.view_own',
    'orders.accept',
    'orders.mark_ready',
    'orders.complete',
    'orders.cancel',
    'menu.view',
    'payments.view',
    'payments.verify',
  ],
  KITCHEN_STAFF: [
    'orders.view_all',
    'orders.prepare',
    'orders.mark_ready',
    'menu.view',
  ],
  CUSTOMER: [
    'orders.create',
    'orders.view_own',
    'menu.view',
  ],
};

// Seed demo users representing each tier of the organization
export const DEMO_USERS: Record<UserRoleType, UserProfile> = {
  SUPER_ADMIN: {
    id: 'user-super-admin-01',
    fullName: 'Shri Dattatreya Swamy (Owner)',
    email: 'superadmin@dattaprasada.com',
    mobile: '9845000001',
    roles: ['SUPER_ADMIN'],
    permissions: ROLE_PERMISSIONS_MAP.SUPER_ADMIN,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  ADMIN: {
    id: 'user-admin-02',
    fullName: 'Raghavendra Bhat (Manager)',
    email: 'manager@dattaprasada.com',
    mobile: '9845000002',
    roles: ['ADMIN'],
    permissions: ROLE_PERMISSIONS_MAP.ADMIN,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  STAFF: {
    id: 'user-staff-03',
    fullName: 'Chethan Kumar (Counter Operator)',
    email: 'counter@dattaprasada.com',
    mobile: '9845000003',
    roles: ['STAFF'],
    permissions: ROLE_PERMISSIONS_MAP.STAFF,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  KITCHEN_STAFF: {
    id: 'user-kitchen-04',
    fullName: 'Shankar Gowda (Head Chef)',
    email: 'kitchen@dattaprasada.com',
    mobile: '9845000004',
    roles: ['KITCHEN_STAFF'],
    permissions: ROLE_PERMISSIONS_MAP.KITCHEN_STAFF,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  CUSTOMER: {
    id: 'user-customer-guest',
    fullName: 'Guest Customer',
    email: 'guest@dattaprasada.com',
    mobile: '9900000000',
    roles: ['CUSTOMER'],
    permissions: ROLE_PERMISSIONS_MAP.CUSTOMER,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

export const hasPermission = (user: UserProfile | null, permission: PermissionKey): boolean => {
  if (!user || !user.isActive) return false;
  return user.permissions.includes(permission);
};

export const hasRole = (user: UserProfile | null, role: UserRoleType): boolean => {
  if (!user || !user.isActive) return false;
  return user.roles.includes(role);
};
