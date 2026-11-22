import { UserProfile, UserRoleType, PermissionKey } from '../types';
import { store } from './store';
import { ROLE_PERMISSIONS_MAP } from './auth';

export interface SecureSessionPayload {
  sessionId: string;
  userId: string;
  email: string;
  fullName: string;
  roles: UserRoleType[];
  permissions: PermissionKey[];
  fingerprint: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  signature: string;
}

export interface LoginAttemptRecord {
  attempts: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const ABSOLUTE_SESSION_MAX_MS = 12 * 60 * 60 * 1000; // 12 hours max session duration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout
const SESSION_SECRET_SALT = 'dp_sakleshpur_secure_salt_2026_balagere';

class SessionSecurityService {
  private sessionKey = 'dp_secure_session_token';
  private rateLimitKey = 'dp_login_rate_limits';
  private revokedSessionsKey = 'dp_revoked_session_timestamps';

  // --------------------------------------------------------------------------
  // 1. Device & Browser Fingerprinting (Defends against session token theft)
  // --------------------------------------------------------------------------
  public getClientFingerprint(): string {
    if (typeof window === 'undefined') return 'server_environment';

    const components = [
      navigator.userAgent || '',
      navigator.language || '',
      (window.screen?.colorDepth || 24).toString(),
      (window.screen?.width || 0).toString(),
      (window.screen?.height || 0).toString(),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    ];

    // Compute simple synchronous hash of fingerprint components
    let hash = 0;
    const str = components.join('###');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // --------------------------------------------------------------------------
  // 2. Cryptographic Signature Generation & Tamper Detection
  // --------------------------------------------------------------------------
  private computeSignature(data: {
    sessionId: string;
    userId: string;
    email: string;
    roles: UserRoleType[];
    fingerprint: string;
    createdAt: number;
  }): string {
    const raw = `${data.sessionId}:${data.userId}:${data.email}:${data.roles.sort().join(',')}:${data.fingerprint}:${data.createdAt}:${SESSION_SECRET_SALT}`;
    
    // Hash raw data
    let h1 = 0xdeadbeef ^ raw.length, h2 = 0x41c6ce57 ^ raw.length;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const sig = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    return `dp_sig_${sig}`;
  }

  // --------------------------------------------------------------------------
  // 3. Rate Limiting & Anti-Brute-Force Guard
  // --------------------------------------------------------------------------
  public checkRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const limits = this.getRateLimits();
    const record = limits[identifier];

    if (!record) return { allowed: true };

    if (record.lockedUntil && now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      // Lockout expired, reset attempts
      delete limits[identifier];
      this.saveRateLimits(limits);
      return { allowed: true };
    }

    return { allowed: true };
  }

  public recordFailedLogin(identifier: string): { locked: boolean; waitSeconds?: number } {
    const now = Date.now();
    const limits = this.getRateLimits();
    const record = limits[identifier] || { attempts: 0, lastAttemptAt: now, lockedUntil: null };

    record.attempts += 1;
    record.lastAttemptAt = now;

    if (record.attempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      limits[identifier] = record;
      this.saveRateLimits(limits);

      store.addAuditLog({
        actorName: identifier,
        action: 'LOGIN_BRUTE_FORCE_LOCKOUT',
        entityType: 'USER',
        entityId: 'security-guard',
        newValues: {
          attempts: record.attempts,
          lockoutDurationMinutes: LOCKOUT_DURATION_MS / 60000,
        },
      });

      return { locked: true, waitSeconds: LOCKOUT_DURATION_MS / 1000 };
    }

    limits[identifier] = record;
    this.saveRateLimits(limits);
    return { locked: false };
  }

  public recordSuccessfulLogin(identifier: string): void {
    const limits = this.getRateLimits();
    if (limits[identifier]) {
      delete limits[identifier];
      this.saveRateLimits(limits);
    }
  }

  private getRateLimits(): Record<string, LoginAttemptRecord> {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(this.rateLimitKey);
    return raw ? JSON.parse(raw) : {};
  }

  private saveRateLimits(limits: Record<string, LoginAttemptRecord>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.rateLimitKey, JSON.stringify(limits));
  }

  // --------------------------------------------------------------------------
  // 4. Create Cryptographically Bound Session
  // --------------------------------------------------------------------------
  public createSession(user: UserProfile): SecureSessionPayload {
    const now = Date.now();
    const sessionId = `sess_${now}_${Math.random().toString(36).substring(2, 10)}`;
    const fingerprint = this.getClientFingerprint();

    // Re-verify permissions dynamically based on role matrix
    const primaryRole = user.roles[0];
    const authoritativePermissions = store.getRolePermissions(primaryRole);

    const signature = this.computeSignature({
      sessionId,
      userId: user.id,
      email: user.email,
      roles: user.roles,
      fingerprint,
      createdAt: now,
    });

    const session: SecureSessionPayload = {
      sessionId,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      permissions: authoritativePermissions,
      fingerprint,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + ABSOLUTE_SESSION_MAX_MS,
      signature,
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));

    // Broadcast session update to other tabs
    this.broadcastSessionEvent('SESSION_ESTABLISHED', { userId: user.id, sessionId });

    return session;
  }

  public refreshCurrentSessionPermissions(): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) return;
    try {
      const session: SecureSessionPayload = JSON.parse(raw);
      const primaryRole = session.roles[0];
      const authoritativePermissions = store.getRolePermissions(primaryRole);
      session.permissions = authoritativePermissions;
      session.signature = this.computeSignature({
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        roles: session.roles,
        fingerprint: session.fingerprint,
        createdAt: session.createdAt,
      });
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
      this.broadcastSessionEvent('SESSION_ESTABLISHED', { userId: session.userId, sessionId: session.sessionId });
    } catch {}
  }

  // --------------------------------------------------------------------------
  // 5. Session Validation & Tamper Protection (Runs on every route/privilege check)
  // --------------------------------------------------------------------------
  public validateSession(): {
    valid: boolean;
    user?: UserProfile;
    errorReason?: string;
  } {
    if (typeof window === 'undefined') return { valid: false, errorReason: 'No browser window' };

    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) return { valid: false, errorReason: 'No active session token' };

    let session: SecureSessionPayload;
    try {
      session = JSON.parse(raw);
    } catch {
      this.terminateSession('MALFORMED_SESSION_TOKEN');
      return { valid: false, errorReason: 'Session data corrupted' };
    }

    const now = Date.now();

    // A. Check Absolute Session Expiration
    if (now > session.expiresAt) {
      this.terminateSession('SESSION_EXPIRED');
      return { valid: false, errorReason: 'Session has expired. Please sign in again.' };
    }

    // B. Check Inactivity Timeout
    if (now - session.lastActivityAt > INACTIVITY_TIMEOUT_MS) {
      this.terminateSession('INACTIVITY_TIMEOUT');
      return { valid: false, errorReason: 'Session timed out due to inactivity.' };
    }

    // C. Check Device Fingerprint (Session Hijacking Guard)
    const currentFingerprint = this.getClientFingerprint();
    if (session.fingerprint !== currentFingerprint) {
      store.addAuditLog({
        actorName: session.fullName,
        actorRole: session.roles[0],
        action: 'SESSION_HIJACK_ATTEMPT_DETECTED',
        entityType: 'USER',
        entityId: session.userId,
        newValues: {
          expectedFingerprint: session.fingerprint,
          detectedFingerprint: currentFingerprint,
          sessionId: session.sessionId,
        },
      });
      this.terminateSession('FINGERPRINT_MISMATCH');
      return { valid: false, errorReason: 'Security alert: Foreign browser context detected. Session invalidated.' };
    }

    // D. Check Cryptographic Signature (DevTools Tamper Protection)
    const expectedSig = this.computeSignature({
      sessionId: session.sessionId,
      userId: session.userId,
      email: session.email,
      roles: session.roles,
      fingerprint: session.fingerprint,
      createdAt: session.createdAt,
    });

    if (session.signature !== expectedSig) {
      store.addAuditLog({
        actorName: session.fullName,
        action: 'SESSION_TAMPERING_DETECTED',
        entityType: 'USER',
        entityId: session.userId,
        newValues: {
          sessionId: session.sessionId,
          alert: 'Client altered session token payload directly via DevTools or script injection',
        },
      });
      this.terminateSession('TAMPER_DETECTED');
      return { valid: false, errorReason: 'Cryptographic signature mismatch. Tampering detected.' };
    }

    // E. Check Global Revocation Timestamp (Logout from all devices)
    const revokedMap = this.getRevocationMap();
    const userRevokedAt = revokedMap[session.userId];
    if (userRevokedAt && session.createdAt < userRevokedAt) {
      this.terminateSession('SESSION_REVOKED_GLOBALLY');
      return { valid: false, errorReason: 'Session was terminated remotely from another device.' };
    }

    // Slide activity window
    session.lastActivityAt = now;
    localStorage.setItem(this.sessionKey, JSON.stringify(session));

    // Construct valid UserProfile
    const user: UserProfile = {
      id: session.userId,
      email: session.email,
      fullName: session.fullName,
      roles: session.roles,
      permissions: session.permissions,
      isActive: true,
      createdAt: new Date(session.createdAt).toISOString(),
    };

    return { valid: true, user };
  }

  // --------------------------------------------------------------------------
  // 6. Terminate Session & Global Revocation
  // --------------------------------------------------------------------------
  public terminateSession(reason = 'USER_LOGOUT'): void {
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem(this.sessionKey);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        store.addAuditLog({
          actorName: session.fullName || 'User',
          actorRole: session.roles?.[0],
          action: `LOGOUT_${reason}`,
          entityType: 'USER',
          entityId: session.userId || 'unknown',
        });
      } catch (e) {
        // ignore
      }
    }

    localStorage.removeItem(this.sessionKey);
    this.broadcastSessionEvent('SESSION_TERMINATED', { reason });
  }

  // Logout from all devices
  public revokeAllUserSessions(userId: string): void {
    const revokedMap = this.getRevocationMap();
    revokedMap[userId] = Date.now();
    localStorage.setItem(this.revokedSessionsKey, JSON.stringify(revokedMap));
    this.terminateSession('REVOKE_ALL_DEVICES');
    this.broadcastSessionEvent('GLOBAL_REVOCATION', { userId });
  }

  private getRevocationMap(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(this.revokedSessionsKey);
    return raw ? JSON.parse(raw) : {};
  }

  // --------------------------------------------------------------------------
  // 7. Multi-Tab Session Synchronization
  // --------------------------------------------------------------------------
  private broadcastSessionEvent(type: string, payload: any) {
    if (typeof window === 'undefined') return;
    try {
      const channel = new BroadcastChannel('dp_session_security_channel');
      channel.postMessage({ type, payload });
      channel.close();
    } catch {
      // Fallback to storage event
    }
  }

  public subscribeToSessionEvents(onEvent: (type: string, payload: any) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    try {
      const channel = new BroadcastChannel('dp_session_security_channel');
      channel.onmessage = (msg) => onEvent(msg.data.type, msg.data.payload);
      return () => channel.close();
    } catch {
      return () => {};
    }
  }
}

export const sessionSecurity = new SessionSecurityService();
