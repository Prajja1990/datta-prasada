import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PermissionKey, UserRoleType } from '../types';
async function rpc(name: string, args = {}) {
  if (!isSupabaseConfigured) throw new Error('A connected database is required to manage permissions.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function loadRolePermissions(): Promise<Record<UserRoleType, PermissionKey[]>> {
  return rpc('get_role_permission_matrix');
}
export async function setRolePermission(role: UserRoleType, permission: PermissionKey, enabled: boolean) {
  await rpc('set_role_permission', { p_role: role, p_permission: permission, p_enabled: enabled });
}
export async function resetRolePermissions() { await rpc('reset_role_permissions'); }
