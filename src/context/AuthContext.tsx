import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContextType, PermissionKey, UserProfile, UserRoleType } from '../types';
import { DEMO_USERS, INITIAL_USER_ACCOUNTS } from '../services/auth';
import { sessionSecurity } from '../services/sessionSecurity';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { userAdmin } from '../services/userAdmin';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(userId: string, email = ''): Promise<UserProfile> {
  const [{ data: profile, error: profileError }, { data: memberships, error: roleError }] = await Promise.all([
    supabase.from('user_profiles').select('id, full_name, mobile, email, is_active, created_at').eq('id', userId).single(),
    supabase.from('user_roles').select('role_id, roles(name)').eq('user_id', userId),
  ]);
  if (profileError) throw profileError;
  if (roleError) throw roleError;
  const roleIds = (memberships || []).map((entry: any) => entry.role_id);
  const { data: grants, error: grantError } = roleIds.length
    ? await supabase.from('role_permissions').select('permissions(permission_key)').in('role_id', roleIds)
    : { data: [], error: null };
  if (grantError) throw grantError;
  const roles = (memberships || []).map((entry: any) => entry.roles?.name).filter(Boolean) as UserRoleType[];
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email || email,
    mobile: profile.mobile || undefined,
    roles,
    permissions: [...new Set((grants || []).map((entry: any) => entry.permissions?.permission_key).filter(Boolean))] as PermissionKey[],
    isActive: profile.is_active,
    createdAt: profile.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const refreshUser = useCallback(async (id: string, email?: string) => {
    const profile = await loadProfile(id, email);
    if (!profile.isActive) {
      await supabase.auth.signOut();
      setUser(null);
      setSecurityNotice('This account is inactive. Contact your administrator.');
      return;
    }
    setUser(profile);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const cached = sessionSecurity.validateSession();
      if (cached.valid) setUser(cached.user || null);
      setIsLoading(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }: any) => {
      if (!alive) return;
      if (error) setSecurityNotice(error.message);
      if (data.session) {
        try { await refreshUser(data.session.user.id, data.session.user.email); }
        catch (e: any) { setSecurityNotice(e.message || 'Unable to load your account profile.'); }
      }
      if (alive) setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (!session) { setUser(null); return; }
      setTimeout(() => refreshUser(session.user.id, session.user.email).catch((e) => setSecurityNotice(e.message)), 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [refreshUser]);

  const loginWithCredentials: AuthContextType['loginWithCredentials'] = async (email, password) => {
    if (!isSupabaseConfigured) {
      const identifier = email.trim().toLowerCase();
      const match = INITIAL_USER_ACCOUNTS.find((account) => account.email.toLowerCase() === identifier && account.password === password);
      if (!match) return { success: false, error: 'Invalid email or password.' };
      sessionSecurity.createSession(match);
      setUser(match);
      return { success: true, role: match.roles[0] };
    }
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      // Existing installations may still have credentials only in user_accounts.
      // Verify those credentials server-side, provision/sync the Auth identity,
      // then establish a normal Supabase Auth session for all RLS-protected APIs.
      const isInvalidCredentials = error && (
        error.code === 'invalid_credentials' ||
        error.code === 'email_not_confirmed' ||
        error.message.toLowerCase().includes('invalid login credentials')
      );
      if (isInvalidCredentials) {
        const { error: bridgeError } = await supabase.functions.invoke('legacy-login', {
          body: { email: normalizedEmail, password },
        });
        if (bridgeError) {
          let message = bridgeError.message;
          if (bridgeError.name === 'FunctionsFetchError' || message.includes('Failed to send a request')) {
            message = 'The login service is unreachable. Deploy the legacy-login Supabase Edge Function to the configured project, then try again.';
          }
          try {
            const response = (bridgeError as any).context;
            const body = response?.json ? await response.json() : null;
            if (body?.error) message = body.error;
          } catch { /* retain the function error message */ }
          return { success: false, error: message || 'Invalid email or password.' };
        }
        const retry = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        data = retry.data;
        error = retry.error;
      }

      if (error) return { success: false, error: error.message };
      const profile = await loadProfile(data.user.id, data.user.email);
      if (!profile.isActive) {
        await supabase.auth.signOut();
        return { success: false, error: 'This account is inactive. Contact your administrator.' };
      }
      setUser(profile);
      return { success: true, role: profile.roles[0] };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unable to sign in.' };
    } finally { setIsLoading(false); }
  };

  const loginAs: AuthContextType['loginAs'] = async (role) => {
    if (isSupabaseConfigured) {
      setSecurityNotice('Demo role switching is disabled for a connected database. Sign in with your assigned account.');
      return;
    }
    const demo = DEMO_USERS[role];
    sessionSecurity.createSession(demo);
    setUser(demo);
  };

  const changePassword: AuthContextType['changePassword'] = async ({ oldPassword, newPassword, targetUserId }) => {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Password changes require a connected Supabase project.' };
    if (!user) return { success: false, error: 'Sign in before changing a password.' };
    if (targetUserId && targetUserId !== user.id) {
      if (!user.roles.includes('SUPER_ADMIN')) return { success: false, error: 'Only a Super Admin can reset another account password.' };
      try {
        await userAdmin.setPassword(targetUserId, newPassword);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || 'Unable to reset this password.' };
      }
    }
    const { data: session } = await supabase.auth.getSession();
    if (oldPassword && session.data.session?.user.email) {
      const { error } = await supabase.auth.signInWithPassword({ email: session.data.session.user.email, password: oldPassword });
      if (error) return { success: false, error: 'Current password is incorrect.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { success: false, error: error.message } : { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    else sessionSecurity.terminateSession('USER_VOLUNTARY_LOGOUT');
    setUser(null);
  };
  const logoutFromAllDevices = async () => logout();
  const hasPermission = (permission: PermissionKey) => !!user?.isActive && user.permissions.includes(permission);
  const hasAnyPermission = (permissions: PermissionKey[]) => permissions.some(hasPermission);
  const hasRole = (role: UserRoleType) => !!user?.isActive && user.roles.includes(role);

  const value = useMemo(() => ({ user, isAuthenticated: !!user, isLoading, securityNotice, loginAs, loginWithCredentials, logout, logoutFromAllDevices, hasPermission, hasAnyPermission, hasRole, changePassword }), [user, isLoading, securityNotice]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
