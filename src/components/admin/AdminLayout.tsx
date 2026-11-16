import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  FolderTree, 
  BarChart3, 
  ShieldAlert, 
  Users, 
  Settings, 
  LogOut, 
  ChefHat, 
  Flame, 
  ArrowLeft,
  Key,
  ShieldCheck
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout, logoutFromAllDevices, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      permission: 'dashboard.view',
    },
    {
      to: '/admin/orders',
      label: 'Live Orders',
      icon: ShoppingBag,
      permission: 'orders.view_all',
    },
    {
      to: '/admin/menu',
      label: 'Menu Management',
      icon: UtensilsCrossed,
      permission: 'menu.update',
    },
    {
      to: '/admin/categories',
      label: 'Categories',
      icon: FolderTree,
      permission: 'menu.update',
    },
    {
      to: '/admin/reports',
      label: 'Sales Reports & Analytics',
      icon: BarChart3,
      permission: 'reports.view',
    },
    {
      to: '/admin/audit-logs',
      label: 'Security Audit Trail',
      icon: ShieldAlert,
      permission: 'audit_logs.view',
    },
    {
      to: '/admin/users',
      label: 'Users & Roles (RBAC)',
      icon: Users,
      permission: 'roles.manage',
    },
    {
      to: '/admin/permissions',
      label: 'System Permissions',
      icon: ShieldCheck,
      permission: 'roles.manage',
    },
    {
      to: '/admin/settings',
      label: 'Restaurant Settings',
      icon: Settings,
      permission: 'settings.manage',
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-temple-900 text-cream-100 flex flex-col justify-between shrink-0 border-r border-gold-800">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-temple-800/80 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white overflow-hidden p-0.5 border border-gold-400 shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Datta Prasada"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-serif font-black text-lg text-gold-400 leading-tight">
                  DATTA PRASADA
                </div>
                <div className="text-[10px] text-stone-400 tracking-wider uppercase font-semibold">
                  Admin Console
                </div>
              </div>
            </Link>
          </div>

          {/* User Role Badge */}
          {user && (
            <div className="px-6 py-4 bg-temple-950/60 border-b border-temple-800/40 space-y-2.5">
              <div>
                <div className="text-xs text-stone-400">Signed in as:</div>
                <div className="text-sm font-bold text-white truncate">{user.fullName}</div>
                <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gold-500/20 text-gold-300 border border-gold-400/40">
                  {user.roles[0].replace('_', ' ')}
                </div>
              </div>

              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-temple-800/90 hover:bg-temple-700 text-gold-300 text-xs font-bold transition border border-gold-500/30 shadow-xs"
              >
                <Key className="w-3.5 h-3.5 text-gold-400" />
                <span>Change Password</span>
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              if (item.permission && !hasPermission(item.permission as any)) {
                return null;
              }
              const isActive = location.pathname === item.to;
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-gold-500 text-temple-950 shadow-sm'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-temple-800 space-y-2">
          <Link
            to="/kitchen"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-temple-800 hover:bg-temple-700 text-stone-200 text-xs font-bold transition"
          >
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span>Open Kitchen KDS</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-stone-400 hover:text-white text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>View Customer App</span>
          </Link>

          <button
            onClick={async () => {
              if (confirm('Revoke sessions on all browsers and devices? You will need to sign in again.')) {
                await logoutFromAllDevices();
                navigate('/staff/login');
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-amber-400 hover:bg-amber-950/40 text-xs font-bold transition"
            title="Revoke active tokens across all phones, tablets, and PCs"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Logout All Devices</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 text-xs font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <Outlet />
      </main>

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
