import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRoleType } from '../../types';
import { 
  ShieldCheck, 
  KeyRound, 
  UserCheck, 
  ChefHat, 
  Store, 
  Crown, 
  ArrowRight,
  Flame,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';

export const StaffLoginPage: React.FC = () => {
  const { loginAs, loginWithCredentials, isAuthenticated, user, securityNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/staff/orders';

  const handleRoleSelect = async (role: UserRoleType) => {
    setIsSubmitting(true);
    try {
      await loginAs(role);
      if (role === 'KITCHEN_STAFF') {
        navigate('/kitchen');
      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate(from);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email or staff ID');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await loginWithCredentials(email, password);
      if (res.success) {
        const emailLower = email.toLowerCase();
        if (emailLower.includes('admin') || emailLower.includes('manager') || emailLower.includes('super')) {
          navigate('/admin/dashboard');
        } else if (emailLower.includes('kitchen') || emailLower.includes('chef')) {
          navigate('/kitchen');
        } else {
          navigate(from);
        }
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden p-1 mx-auto border-2 border-gold-400 shadow-traditional flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="Datta Prasada"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <h1 className="font-serif font-black text-3xl text-temple-900">
            Datta Prasada Staff Portal
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm">
            Operational and kitchen access control (Role-Based Access Control)
          </p>
        </div>

        {securityNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <div className="font-bold">Security Notice</div>
              <div>{securityNotice}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Fast Role Picker for Testing */}
        <div className="bg-white rounded-3xl border border-gold-200 shadow-traditional p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Quick Role Switcher (For Evaluation)
            </span>
            <span className="text-[10px] bg-gold-100 text-gold-900 font-bold px-2 py-0.5 rounded-full">
              Demo Mode
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRoleSelect('STAFF')}
              disabled={isSubmitting}
              className="p-3 rounded-xl border border-stone-200 hover:border-temple-600 hover:bg-cream-50 text-left transition space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <Store className="w-4 h-4 text-temple-700" />
                <span className="text-[9px] font-bold text-stone-400">COUNTER</span>
              </div>
              <div className="font-bold text-xs text-stone-900 group-hover:text-temple-800">
                Counter Staff
              </div>
              <div className="text-[10px] text-stone-500 line-clamp-1">
                Orders & Payments
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('KITCHEN_STAFF')}
              disabled={isSubmitting}
              className="p-3 rounded-xl border border-stone-200 hover:border-temple-600 hover:bg-cream-50 text-left transition space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <ChefHat className="w-4 h-4 text-amber-600" />
                <span className="text-[9px] font-bold text-stone-400">KDS</span>
              </div>
              <div className="font-bold text-xs text-stone-900 group-hover:text-amber-800">
                Kitchen Chef
              </div>
              <div className="text-[10px] text-stone-500 line-clamp-1">
                Prep Queue Only
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('ADMIN')}
              disabled={isSubmitting}
              className="p-3 rounded-xl border border-stone-200 hover:border-gold-600 hover:bg-cream-50 text-left transition space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <UserCheck className="w-4 h-4 text-gold-700" />
                <span className="text-[9px] font-bold text-stone-400">MANAGER</span>
              </div>
              <div className="font-bold text-xs text-stone-900 group-hover:text-gold-800">
                Restaurant Admin
              </div>
              <div className="text-[10px] text-stone-500 line-clamp-1">
                Reports & Menu
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('SUPER_ADMIN')}
              disabled={isSubmitting}
              className="p-3 rounded-xl border border-stone-200 hover:border-purple-600 hover:bg-purple-50 text-left transition space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <Crown className="w-4 h-4 text-purple-700" />
                <span className="text-[9px] font-bold text-stone-400">OWNER</span>
              </div>
              <div className="font-bold text-xs text-stone-900 group-hover:text-purple-800">
                Super Admin
              </div>
              <div className="text-[10px] text-stone-500 line-clamp-1">
                Full System RBAC
              </div>
            </button>
          </div>
        </div>

        {/* Regular Credential Form */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Sign In with Staff Account
          </div>

          <form onSubmit={handleFormLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Staff Email or ID
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., counter@dattaprasada.com"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Password / PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-sm shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Login to Staff System</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link to="/" className="text-stone-500 hover:text-stone-800 text-xs font-medium">
            ← Back to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
