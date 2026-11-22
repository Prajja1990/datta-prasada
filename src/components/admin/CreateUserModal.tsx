import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../services/store';
import { ROLE_PERMISSIONS_MAP } from '../../services/auth';
import { userAdmin } from '../../services/userAdmin';
import { isSupabaseConfigured } from '../../lib/supabase';
import { UserRoleType, UserAccount } from '../../types';
import { 
  UserPlus, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Crown,
  ChefHat,
  Store,
  UserCheck,
  User,
  Copy,
  Eye as EyeIcon
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserAccount) => void;
}

const ROLES_CONFIG: {
  role: UserRoleType;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    role: 'SUPER_ADMIN',
    title: 'Super Admin (Owner)',
    badge: 'Platform Owner',
    description: 'Complete system authorization: create users, assign roles, reset credentials, outlet settings',
    icon: Crown,
    color: 'border-purple-300 bg-purple-50/50 text-purple-900',
  },
  {
    role: 'ADMIN',
    title: 'Restaurant Admin (Manager)',
    badge: 'Operations Manager',
    description: 'Menu and category administration, price adjustments, sales analytics, and audit trail',
    icon: UserCheck,
    color: 'border-gold-300 bg-gold-50/50 text-gold-900',
  },
  {
    role: 'STAFF',
    title: 'Counter Staff (Billing)',
    badge: 'Front-Desk Billing',
    description: 'Accept customer orders, record cash/UPI payments, print receipts, and mark orders completed',
    icon: Store,
    color: 'border-blue-300 bg-blue-50/50 text-blue-900',
  },
  {
    role: 'KITCHEN_STAFF',
    title: 'Kitchen Chef (KDS)',
    badge: 'Kitchen Crew',
    description: 'Full-screen kitchen display system, live prep queue, ticket status transitions',
    icon: ChefHat,
    color: 'border-amber-300 bg-amber-50/50 text-amber-900',
  },
  {
    role: 'CUSTOMER',
    title: 'Customer (Self-Ordering)',
    badge: 'Dine-In / Takeaway Guest',
    description: 'Place digital orders, scan QR menu, track token in real-time',
    icon: User,
    color: 'border-stone-300 bg-stone-50/50 text-stone-800',
  },
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('STAFF');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showPermsPreview, setShowPermsPreview] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    let generated = 'Datta@';
    for (let i = 0; i < 4; i++) {
      generated += Math.floor(Math.random() * 10);
    }
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setError(null);
  };

  const handleCopyPassword = () => {
    if (password && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(password);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide the full name of the user (at least 2 characters).');
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = isSupabaseConfigured
        ? await userAdmin.create({ fullName: fullName.trim(), email: cleanEmail, mobile: mobile.trim() || undefined, role: selectedRole, password, isActive })
        : (() => {
            const result = store.createUser({ fullName: fullName.trim(), email: cleanEmail, mobile: mobile.trim() || undefined, role: selectedRole, password, isActive }, { name: currentUser?.fullName || 'Super Admin', role: currentUser?.roles[0] || 'SUPER_ADMIN' });
            if (!result.success || !result.user) throw new Error(result.error || 'Failed to create user account.');
            return result.user;
          })();

      setSuccess(`Account for ${created.fullName} successfully created with role ${selectedRole}!`);
      setTimeout(() => {
        onSuccess?.(created);
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setMobile('');
    setSelectedRole('STAFF');
    setPassword('');
    setConfirmPassword('');
    setIsActive(true);
    setError(null);
    setSuccess(null);
    onClose();
  };

  const currentRoleConfig = ROLES_CONFIG.find(r => r.role === selectedRole);
  const permissionsCount = ROLE_PERMISSIONS_MAP[selectedRole]?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 border border-gold-300 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-temple-100 text-temple-800 flex items-center justify-center shrink-0 border border-gold-300">
              <UserPlus className="w-6 h-6 text-temple-800" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mb-0.5">
                <Crown className="w-3 h-3 text-amber-700" />
                <span>Super Admin RBAC Authority</span>
              </div>
              <h2 className="font-serif font-black text-2xl text-stone-900 leading-tight">
                Create New User Account
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-green-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Prajwal Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., prajwal@dattaprasada.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Mobile Number (Optional)
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g., 98450 12345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-stone-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-temple-700 focus:ring-gold-500"
                />
                <span className="font-bold text-stone-800">
                  {isActive ? 'Account Active & Enabled' : 'Account Deactivated'}
                </span>
              </label>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Select Enterprise Role <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-stone-500">
                Grants {permissionsCount} system permissions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLES_CONFIG.map((cfg) => {
                const isSelected = selectedRole === cfg.role;
                const Icon = cfg.icon;
                return (
                  <label
                    key={cfg.role}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition text-left ${
                      isSelected
                        ? `${cfg.color} ring-2 ring-gold-500 font-semibold shadow-sm`
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rolePicker"
                      checked={isSelected}
                      onChange={() => setSelectedRole(cfg.role)}
                      className="mt-1 text-temple-700 focus:ring-gold-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{cfg.title}</span>
                        <Icon className="w-4 h-4 shrink-0 text-stone-500" />
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                        {cfg.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Inspect granted permissions accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPermsPreview(!showPermsPreview)}
                className="text-[11px] font-bold text-temple-700 hover:text-temple-900 inline-flex items-center gap-1.5 transition"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>{showPermsPreview ? 'Hide' : 'Inspect'} All {permissionsCount} System Capabilities for {selectedRole}</span>
              </button>

              {showPermsPreview && (
                <div className="mt-2 p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs max-h-40 overflow-y-auto space-y-1.5 animate-fadeIn">
                  {(ROLE_PERMISSIONS_MAP[selectedRole] || []).map((permKey) => (
                    <div key={permKey} className="flex items-center justify-between text-[11px] py-0.5 border-b border-stone-100 last:border-0">
                      <span className="font-mono text-stone-800">{permKey}</span>
                      <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        Granted
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Credentials Setup */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Initial Account Password <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-temple-700 hover:text-temple-900 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>Auto-Generate Strong Password</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900 font-mono"
                />
              </div>
            </div>

            {password && (
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>Password length: {password.length} characters</span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="text-temple-700 hover:underline flex items-center gap-1 font-bold"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedNotification ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-stone-600 hover:text-stone-900 font-bold text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !!success}
              className="px-6 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-serif font-bold text-xs shadow-traditional transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-gold-400" />
              <span>{isSubmitting ? 'Creating...' : 'Create Staff Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
