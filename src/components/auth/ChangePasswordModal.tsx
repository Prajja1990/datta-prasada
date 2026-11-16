import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';
import { sessionSecurity } from '../../services/sessionSecurity';
import { 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Sparkles,
  Copy
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserProfile | null;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const { user: currentUser, changePassword, hasRole } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [revokeSessions, setRevokeSessions] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  // Determine if this is an administrative reset by Super Admin for another user
  const isSuperAdminReset = !!(
    targetUser && 
    currentUser && 
    targetUser.id !== currentUser.id && 
    hasRole('SUPER_ADMIN')
  );

  const activeTarget = targetUser || currentUser;

  // Password strength score
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-stone-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-green-600' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleGenerateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let generated = 'Datta@';
    for (let i = 0; i < 4; i++) {
      generated += Math.floor(Math.random() * 10);
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPass(true);
    setError(null);
  };

  const handleCopyPassword = () => {
    if (newPassword && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(newPassword);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSuperAdminReset && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (!isSuperAdminReset && currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword({
        oldPassword: isSuperAdminReset ? undefined : currentPassword,
        newPassword,
        targetUserId: isSuperAdminReset ? targetUser?.id : undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to update password.');
        return;
      }

      if (isSuperAdminReset && revokeSessions && targetUser) {
        sessionSecurity.revokeAllUserSessions(targetUser.id);
      }

      setSuccess(
        isSuperAdminReset
          ? `Password successfully reset for ${activeTarget?.fullName}.`
          : 'Your password has been changed successfully!'
      );

      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 border border-gold-300 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-800 flex items-center justify-center shrink-0 border border-gold-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black text-xl text-stone-900 leading-tight">
                {isSuperAdminReset ? 'Reset User Password' : 'Change Password'}
              </h2>
              <p className="text-[11px] text-stone-500">
                {isSuperAdminReset
                  ? `Super Admin authority for ${activeTarget?.fullName}`
                  : `Signed in as ${activeTarget?.fullName} (${activeTarget?.roles[0].replace('_', ' ')})`}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Profile Banner for Admin Mode */}
        {isSuperAdminReset && targetUser && (
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <div className="font-bold">{targetUser.fullName}</div>
              <div className="text-[11px] text-amber-700 font-mono">{targetUser.email}</div>
            </div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-200/70 text-amber-900 border border-amber-300">
              {targetUser.roles[0].replace('_', ' ')}
            </span>
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password (only required in self-service mode) */}
          {!isSuperAdminReset && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                {isSuperAdminReset ? 'New Temporary / Permanent Password' : 'New Password'}
              </label>

              {/* Generate random strong password */}
              <button
                type="button"
                onClick={handleGenerateStrongPassword}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-temple-700 hover:text-temple-900 transition"
              >
                <Sparkles className="w-3 h-3 text-gold-600" />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-500">
                  <span>Strength: {strength.label}</span>
                  {showNewPass && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="text-temple-700 hover:underline flex items-center gap-1 text-[10px]"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>{copiedNotification ? 'Copied!' : 'Copy Password'}</span>
                    </button>
                  )}
                </div>
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full transition-all rounded-full ${strength.color}`}
                    style={{ width: `${(strength.score / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type={showNewPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 text-stone-900"
            />
          </div>

          {/* Revoke other sessions toggle for Super Admin */}
          {isSuperAdminReset && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={revokeSessions}
                onChange={(e) => setRevokeSessions(e.target.checked)}
                className="rounded text-temple-700 focus:ring-gold-500 mt-0.5"
              />
              <span className="text-stone-700 leading-snug">
                <strong>Revoke all active device sessions</strong>
                <br />
                <span className="text-stone-500 text-[11px]">
                  Forces user to immediately re-authenticate with the new password on all phones, tablets, or terminals.
                </span>
              </span>
            </label>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
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
              className="px-6 py-2.5 rounded-xl bg-temple-700 hover:bg-temple-800 text-white font-bold text-xs shadow-traditional transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-gold-400" />
              <span>{isSubmitting ? 'Updating...' : isSuperAdminReset ? 'Commit Password Reset' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
