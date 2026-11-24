// ============================================================================
// Datta Prasada - Type Definitions & RBAC Architecture
// ============================================================================

export type UserRoleType = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'STAFF' 
  | 'KITCHEN_STAFF' 
  | 'CUSTOMER';

export type PermissionKey =
  | 'dashboard.view'
  | 'orders.create'
  | 'orders.view_all'
  | 'orders.view_own'
  | 'orders.accept'
  | 'orders.prepare'
  | 'orders.mark_ready'
  | 'orders.complete'
  | 'orders.cancel'
  | 'menu.view'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'menu.manage_price'
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.deactivate'
  | 'roles.assign'
  | 'roles.manage'
  | 'reports.view'
  | 'reports.export'
  | 'payments.view'
  | 'payments.verify'
  | 'payments.refund'
  | 'settings.manage'
  | 'audit_logs.view';

export interface UserProfile {
  id: string;
  fullName: string;
  mobile?: string;
  email: string;
  roles: UserRoleType[];
  permissions: PermissionKey[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserAccount extends UserProfile {
  password?: string;
  passwordHash?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  securityNotice: string | null;
  loginAs: (role: UserRoleType) => Promise<void>;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; error?: string; role?: UserRoleType }>;
  logout: () => Promise<void>;
  logoutFromAllDevices: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasRole: (role: UserRoleType) => boolean;
  changePassword: (params: { oldPassword?: string; newPassword: string; targetUserId?: string }) => Promise<{ success: boolean; error?: string }>;
}

export interface Category {
  id: string;
  name: string;
  nameKn: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  createdAt?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameKn: string;
  description: string;
  descriptionKn: string;
  price: number;
  imageUrl: string;
  isVeg: boolean;
  available: boolean;
  featured: boolean;
  preparationTimeMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY';
export type PaymentMethod = 'UPI' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id?: string;
  menuItemId: string;
  name: string;
  nameKn?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  tokenNumber: string; // e.g. "DP-001"
  tokenDate: string; // YYYY-MM-DD
  trackingToken: string; // Unguessable secure token for capability-based tracking
  customerId?: string;
  customerName: string;
  customerMobile: string;
  orderType: OrderType;
  tableNumber?: string;
  subtotal: number;
  taxAmount: number;
  parcelCharge?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes?: string;
  estimatedPrepTimeMinutes: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  paymentProvider: 'RAZORPAY' | 'CASH';
  transactionId?: string;
  amount: number;
  paymentStatus: PaymentStatus;
  signature?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedByName: string;
  reason?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole?: string;
  action: string;
  entityType: 'ORDER' | 'MENU_ITEM' | 'CATEGORY' | 'USER' | 'PAYMENT' | 'SETTING' | 'ROLE_PERMISSION';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export type Language = 'en' | 'kn';

export interface RestaurantSettings {
  name: string;
  tagline: string;
  taglineKn: string;
  address: string;
  addressKn: string;
  phone: string;
  email: string;
  openingHours: string;
  openingHoursKn: string;
  gstRate: number; // e.g. 0.05 (5%)
  upiVpa: string;
  tokenPrefix: string;
  enableThermalPrintAuto: boolean;
}
