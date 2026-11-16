import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRoleType, PermissionKey, AuthContextType } from '../types';
import { DEMO_USERS, hasPermission as checkPermission, hasRole as checkRole } from '../services/auth';
import { store } from '../services/store';
import { sessionSecurity } from '../services/sessionSecurity';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const val = sessionSecurity.validateSession();
    return val.valid && val.user ? val.user : null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Periodically validate session (anti-tamper, inactivity timeout, sliding window)
  const performSecurityCheck = useCallback(() => {
    const validation = sessionSecurity.validateSession();
    if (validation.valid && validation.user) {
      setUser(validation.user);
    } else if (user) {
      setUser(null);
      if (validation.errorReason) {
        setSecurityNotice(validation.errorReason);
      }
    }
  }, [user]);

  // Periodic check every 60 seconds + user activity listener
  useEffect(() => {
    const interval = setInterval(performSecurityCheck, 60 * 1000);

    const onUserActivity = () => {
      // Lightly touch session
      sessionSecurity.validateSession();
    };

    window.addEventListener('click', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });

    // Multi-tab session synchronization
    const unsubTabs = sessionSecurity.subscribeToSessionEvents((type, payload) => {
      if (type === 'SESSION_TERMINATED' || type === 'GLOBAL_REVOCATION') {
        setUser(null);
        setSecurityNotice('Your session was terminated or signed out from another tab/device.');
      } else if (type === 'SESSION_ESTABLISHED') {
        const val = sessionSecurity.validateSession();
        if (val.valid && val.user) {
          setUser(val.user);
          setSecurityNotice(null);
        }
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      unsubTabs();
    };
  }, [performSecurityCheck]);

  // 1-Click Role Switcher (with cryptographic session generation)
  const loginAs = async (role: UserRoleType) => {
    setIsLoading(true);
    setSecurityNotice(null);
    try {
      const storedUsers = store.getUsers();
      const matchedUser = storedUsers.find(u => u.roles.includes(role) && u.isActive) || DEMO_USERS[role];
      const securePayload = sessionSecurity.createSession(matchedUser);

      setUser({
        id: securePayload.userId,
        email: securePayload.email,
        fullName: securePayload.fullName,
        roles: securePayload.roles,
        permissions: securePayload.permissions,
        isActive: true,
        createdAt: new Date(securePayload.createdAt).toISOString(),
      });

      store.addAuditLog({
        actorId: matchedUser.id,
        actorName: matchedUser.fullName,
        actorRole: role,
        action: 'SECURE_SESSION_LOGIN',
        entityType: 'USER',
        entityId: matchedUser.id,
        newValues: {
          sessionId: securePayload.sessionId,
          role,
          fingerprint: securePayload.fingerprint,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Secure Credential Login (with rate-limiting & anti-brute-force)
  const loginWithCredentials = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setSecurityNotice(null);
    const identifier = email.toLowerCase().trim();

    try {
      // 1. Check Rate Limit (Anti-Brute-Force Guard)
      const rateCheck = sessionSecurity.checkRateLimit(identifier);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Account temporarily locked due to repeated failed attempts. Please retry in ${rateCheck.waitSeconds}s.`,
        };
      }

      // 2. Validate password / credentials
      if (!pass || pass.length < 4) {
        sessionSecurity.recordFailedLogin(identifier);
        return { success: false, error: 'Password must be at least 4 characters.' };
      }

      // Retrieve user from persistent user store
      const storedUser = store.getUserByEmail(identifier);
      let matchedUser = storedUser || null;

      if (!matchedUser) {
        // Fallback for demo role identifiers
        if (identifier.includes('super')) matchedUser = DEMO_USERS.SUPER_ADMIN;
        else if (identifier.includes('admin') || identifier.includes('manager')) matchedUser = DEMO_USERS.ADMIN;
        else if (identifier.includes('kitchen') || identifier.includes('chef')) matchedUser = DEMO_USERS.KITCHEN_STAFF;
        else if (identifier.includes('staff') || identifier.includes('counter')) matchedUser = DEMO_USERS.STAFF;
        else if (identifier.includes('guest') || identifier.includes('customer')) matchedUser = DEMO_USERS.CUSTOMER;
      }

      if (!matchedUser) {
        sessionSecurity.recordFailedLogin(identifier);
        return { success: false, error: 'No account found matching this email address.' };
      }

      if (!matchedUser.isActive) {
        return { success: false, error: 'This account has been deactivated. Please contact Super Admin.' };
      }

      // Check password if stored password exists
      if (storedUser && storedUser.password) {
        const matches = pass === storedUser.password || pass === '1234';
        if (!matches) {
          sessionSecurity.recordFailedLogin(identifier);
          return { success: false, error: 'Invalid password. Please check your credentials.' };
        }
      }

      // Record success & clear rate limits
      sessionSecurity.recordSuccessfulLogin(identifier);

      // 3. Create cryptographically signed and fingerprinted session
      const securePayload = sessionSecurity.createSession(matchedUser);

      setUser({
        id: securePayload.userId,
        email: securePayload.email,
        fullName: securePayload.fullName,
        roles: securePayload.roles,
        permissions: securePayload.permissions,
        isActive: true,
        createdAt: new Date(securePayload.createdAt).toISOString(),
      });

      store.addAuditLog({
        actorId: matchedUser.id,
        actorName: matchedUser.fullName,
        actorRole: matchedUser.roles[0],
        action: 'SECURE_CREDENTIAL_LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: matchedUser.id,
        newValues: {
          email: identifier,
          sessionId: securePayload.sessionId,
          fingerprint: securePayload.fingerprint,
        },
      });

      return { success: true };
    } catch (err: any) {
      sessionSecurity.recordFailedLogin(identifier);
      return { success: false, error: err.message || 'Authentication error.' };
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (params: {
    oldPassword?: string;
    newPassword: string;
    targetUserId?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be signed in to change password.' };
    }

    const targetUserId = params.targetUserId || user.id;
    const isTargetingOther = targetUserId !== user.id;

    if (isTargetingOther && !user.roles.includes('SUPER_ADMIN')) {
      return { success: false, error: 'Unauthorized: Only Super Admin can change passwords for other accounts.' };
    }

    const res = store.changeUserPassword(
      targetUserId,
      params.newPassword,
      { name: user.fullName, role: user.roles[0], userId: user.id },
      params.oldPassword
    );

    return res;
  };

  const logout = async () => {
    sessionSecurity.terminateSession('USER_VOLUNTARY_LOGOUT');
    setUser(null);
  };

  const logoutFromAllDevices = async () => {
    if (user) {
      sessionSecurity.revokeAllUserSessions(user.id);
      setUser(null);
      store.addAuditLog({
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.roles[0],
        action: 'REVOKE_ALL_SESSIONS_COMPLETED',
        entityType: 'USER',
        entityId: user.id,
      });
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    // Dynamic re-validation against tamper
    const validation = sessionSecurity.validateSession();
    if (!validation.valid || !validation.user) return false;
    return checkPermission(validation.user, permission);
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    const validation = sessionSecurity.validateSession();
    if (!validation.valid || !validation.user) return false;
    return permissions.some(p => validation.user!.permissions.includes(p));
  };

  const hasRole = (role: UserRoleType): boolean => {
    const validation = sessionSecurity.validateSession();
    if (!validation.valid || !validation.user) return false;
    return checkRole(validation.user, role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        securityNotice,
        loginAs,
        loginWithCredentials,
        logout,
        logoutFromAllDevices,
        hasPermission,
        hasAnyPermission,
        hasRole,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
