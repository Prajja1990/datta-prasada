import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserAccount, UserRoleType } from '../types';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
}

async function invoke(action: string, payload: Record<string, unknown> = {}) {
  ensureConfigured();
  const { data, error } = await supabase.functions.invoke('user-admin', { body: { action, ...payload } });
  if (error) {
    let message = error.message || 'User administration request failed.';
    if (error.name === 'FunctionsFetchError' || message.includes('Failed to send a request')) {
      message = 'The user administration service is unreachable. Check that the user-admin Edge Function is deployed to the configured Supabase project.';
    }
    try {
      const response = (error as any).context;
      const body = response?.json ? await response.json() : null;
      if (body?.error) message = body.error;
    } catch { /* retain the transport error when the response is not JSON */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const userAdmin = {
  async list(): Promise<UserAccount[]> {
    const result = await invoke('list');
    return result.users as UserAccount[];
  },
  async create(input: { fullName: string; email: string; mobile?: string; password: string; role: UserRoleType; isActive: boolean }): Promise<UserAccount> {
    const result = await invoke('create', input);
    return result.user as UserAccount;
  },
  async setRole(userId: string, role: UserRoleType) {
    return invoke('set_role', { userId, role });
  },
  async setActive(userId: string, isActive: boolean) {
    return invoke('set_active', { userId, isActive });
  },
  async setPassword(userId: string, password: string) {
    return invoke('set_password', { userId, password });
  },
  async update(userId: string, values: { fullName: string; email: string; mobile?: string }) {
    return invoke('update', { userId, ...values });
  },
};
