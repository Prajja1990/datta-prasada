import { UserRoleType, PermissionKey, UserProfile, UserAccount } from '../types';

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
    // Note: 'dashboard.view' is restricted from counter staff. Only live orders and counter operations are permitted.
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

// Default persistent user accounts including initial credentials
export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    ...DEMO_USERS.SUPER_ADMIN,
    password: 'SuperAdmin@123',
    updatedAt: new Date().toISOString(),
  },
  {
    ...DEMO_USERS.ADMIN,
    password: 'Manager@123',
    updatedAt: new Date().toISOString(),
  },
  {
    ...DEMO_USERS.STAFF,
    password: 'Counter@123',
    updatedAt: new Date().toISOString(),
  },
  {
    ...DEMO_USERS.KITCHEN_STAFF,
    password: 'Kitchen@123',
    updatedAt: new Date().toISOString(),
  },
  {
    ...DEMO_USERS.CUSTOMER,
    password: 'Customer@123',
    updatedAt: new Date().toISOString(),
  },
];

export const hasPermission = (user: UserProfile | null, permission: PermissionKey): boolean => {
  if (!user || !user.isActive) return false;
  return user.permissions.includes(permission);
};

export const hasRole = (user: UserProfile | null, role: UserRoleType): boolean => {
  if (!user || !user.isActive) return false;
  return user.roles.includes(role);
};

export interface PermissionDefinition {
  key: PermissionKey;
  domain: string;
  name: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Dashboard & Analytics
  {
    key: 'dashboard.view',
    domain: 'Dashboard & Overview',
    name: 'View Analytics Overview',
    description: 'Inspect executive dashboard, live revenue figures, cash vs UPI totals, and daily sales metrics. Restricted to Super Admin and Admin (Manager); hidden from Counter Staff.',
  },
  // Orders & POS
  {
    key: 'orders.create',
    domain: 'Orders & POS',
    name: 'Create Orders',
    description: 'Place dine-in and takeaway orders via customer storefront or counter staff billing terminal.',
  },
  {
    key: 'orders.view_all',
    domain: 'Orders & POS',
    name: 'View All Live Orders',
    description: 'Inspect live orders queue across all stations, active tokens, customer names, and prep statuses.',
  },
  {
    key: 'orders.view_own',
    domain: 'Orders & POS',
    name: 'View Own Orders',
    description: 'Track own order token, cooking stage, and digital bill from customer device.',
  },
  {
    key: 'orders.accept',
    domain: 'Orders & POS',
    name: 'Accept Orders',
    description: 'Acknowledge placed customer orders and advance them to active kitchen preparation queue.',
  },
  {
    key: 'orders.prepare',
    domain: 'Orders & POS',
    name: 'Prepare Food Tickets',
    description: 'Mark order items as cooking/preparing on the Kitchen Display System (KDS).',
  },
  {
    key: 'orders.mark_ready',
    domain: 'Orders & POS',
    name: 'Mark Orders as Ready',
    description: 'Notify counter staff and customers that the order is hot, prepared, and ready for pickup.',
  },
  {
    key: 'orders.complete',
    domain: 'Orders & POS',
    name: 'Complete & Dispatch Orders',
    description: 'Finalize order handoff to customer at counter and conclude the order lifecycle.',
  },
  {
    key: 'orders.cancel',
    domain: 'Orders & POS',
    name: 'Cancel Orders',
    description: 'Void or cancel an existing order with required audit reason tracking.',
  },
  // Menu & Catalog
  {
    key: 'menu.view',
    domain: 'Menu & Catalog',
    name: 'View Menu Items',
    description: 'Browse Sakleshpur authentic dishes, categories, pricing, and ingredients.',
  },
  {
    key: 'menu.create',
    domain: 'Menu & Catalog',
    name: 'Create Menu Items',
    description: 'Add new traditional food items, combos, and beverages to the restaurant menu.',
  },
  {
    key: 'menu.update',
    domain: 'Menu & Catalog',
    name: 'Edit Menu Items & Categories',
    description: 'Update dish details, Kannada descriptions, image URLs, and live availability toggles.',
  },
  {
    key: 'menu.delete',
    domain: 'Menu & Catalog',
    name: 'Delete Menu Items',
    description: 'Permanently remove dishes or categories from the restaurant catalog.',
  },
  {
    key: 'menu.manage_price',
    domain: 'Menu & Catalog',
    name: 'Manage Menu Prices',
    description: 'Adjust menu prices, GST application, and promotional rates.',
  },
  // User Administration
  {
    key: 'users.view',
    domain: 'User Administration',
    name: 'View User Accounts',
    description: 'View staff members, contact emails, assigned roles, and account statuses.',
  },
  {
    key: 'users.create',
    domain: 'User Administration',
    name: 'Create User Accounts',
    description: 'Super Admin authority to register new personnel accounts, assign initial credentials, and configure access.',
  },
  {
    key: 'users.update',
    domain: 'User Administration',
    name: 'Update User Details',
    description: 'Edit personal information, names, phone numbers, and contact details of users.',
  },
  {
    key: 'users.deactivate',
    domain: 'User Administration',
    name: 'Activate / Deactivate Accounts',
    description: 'Suspend or reinstate personnel accounts from accessing the system.',
  },
  // Roles & RBAC
  {
    key: 'roles.assign',
    domain: 'Roles & RBAC',
    name: 'Assign Roles to Users',
    description: 'Allocate enterprise roles (Super Admin, Admin, Staff, Kitchen, Customer) to staff accounts.',
  },
  {
    key: 'roles.manage',
    domain: 'Roles & RBAC',
    name: 'Manage System Roles & RBAC',
    description: 'Administer role-based access control hierarchies and inspect system-wide permission entitlements.',
  },
  // Reports & Analytics
  {
    key: 'reports.view',
    domain: 'Reports & Analytics',
    name: 'View Sales Reports',
    description: 'Inspect daily, weekly, and monthly sales reports, top-selling dishes, and revenue trends.',
  },
  {
    key: 'reports.export',
    domain: 'Reports & Analytics',
    name: 'Export Sales Reports',
    description: 'Download CSV and financial spreadsheets of transaction history.',
  },
  // Payments & Billing
  {
    key: 'payments.view',
    domain: 'Payments & Billing',
    name: 'View Payment Transactions',
    description: 'Review UPI transaction IDs, cash collection logs, and payment settlement statuses.',
  },
  {
    key: 'payments.verify',
    domain: 'Payments & Billing',
    name: 'Verify & Settle Payments',
    description: 'Mark cash as received at counter or reconcile UPI QR payments.',
  },
  {
    key: 'payments.refund',
    domain: 'Payments & Billing',
    name: 'Process Refunds',
    description: 'Issue customer refunds for cancelled or disputed orders.',
  },
  // Outlet Settings
  {
    key: 'settings.manage',
    domain: 'Outlet Settings',
    name: 'Manage Operational Settings',
    description: 'Configure restaurant address, UPI VPA, GST tax rates, and 58mm/80mm thermal receipt hardware.',
  },
  // Security & Auditing
  {
    key: 'audit_logs.view',
    domain: 'Security & Auditing',
    name: 'View Security Audit Trail',
    description: 'Inspect tamper-evident system audit logs of every status change, role reassignment, and login attempt.',
  },
];
