import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'User administration service is not configured.' }, 500);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in is required.' }, 401);

  const token = authorization.slice(7);
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Your session is invalid or expired.' }, 401);
  const callerId = authData.user.id;

  const hasPermission = async (key: string) => {
    const { data: activeProfile } = await admin.from('user_profiles').select('is_active').eq('id', callerId).maybeSingle();
    if (!activeProfile?.is_active) return false;
    const { data: memberships } = await admin.from('user_roles').select('role_id').eq('user_id', callerId);
    const roleIds = (memberships || []).map((row: any) => row.role_id);
    if (!roleIds.length) return false;
    const { data: grants } = await admin.from('role_permissions').select('permission_id').in('role_id', roleIds);
    const permissionIds = (grants || []).map((row: any) => row.permission_id);
    if (!permissionIds.length) return false;
    const { data: permission } = await admin.from('permissions').select('id').eq('permission_key', key).in('id', permissionIds).maybeSingle();
    return !!permission;
  };
  const requirePermission = async (key: string) => await hasPermission(key);
  const targetIsSuperAdmin = async (id: string) => {
    const { data: role } = await admin.from('user_roles').select('roles!inner(name)').eq('user_id', id).eq('roles.name', 'SUPER_ADMIN').maybeSingle();
    return !!role;
  };
  const assignRole = async (id: string, roleName: string) => {
    const { data: role, error: roleError } = await admin.from('roles').select('id').eq('name', roleName).single();
    if (roleError || !role) throw new Error(`Unknown role: ${roleName}`);
    const { error: removeError } = await admin.from('user_roles').delete().eq('user_id', id);
    if (removeError) throw removeError;
    const { error: insertError } = await admin.from('user_roles').insert({ user_id: id, role_id: role.id, assigned_by: callerId });
    if (insertError) throw insertError;
  };
  const userJson = async (id: string): Promise<any> => {
    const { data: profile, error } = await admin.from('user_profiles').select('id, full_name, email, mobile, is_active, created_at').eq('id', id).single();
    if (error) throw error;
    const { data: memberships } = await admin.from('user_roles').select('role_id, roles(name)').eq('user_id', id);
    const roleIds = (memberships || []).map((m: any) => m.role_id);
    const { data: grants } = roleIds.length ? await admin.from('role_permissions').select('permissions(permission_key)').in('role_id', roleIds) : { data: [] };
    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email || '',
      mobile: profile.mobile || undefined,
      roles: (memberships || []).map((m: any) => m.roles?.name).filter(Boolean),
      permissions: [...new Set((grants || []).map((g: any) => g.permissions?.permission_key).filter(Boolean))],
      isActive: profile.is_active,
      createdAt: profile.created_at,
    };
  };

  let newlyCreatedAuthUserId: string | null = null;
  try {
    const body = await request.json();
    const { action } = body;
    if (action === 'list') {
      if (!await requirePermission('users.view')) return json({ error: 'You do not have permission to view users.' }, 403);
      const { data: profiles, error } = await admin.from('user_profiles').select('id').order('full_name');
      if (error) throw error;
      const users = await Promise.all((profiles || []).map((p: any) => userJson(p.id)));
      return json({ users });
    }

    if (action === 'create') {
      if (!await requirePermission('users.create') || !await requirePermission('roles.assign')) return json({ error: 'You do not have permission to create accounts and assign roles.' }, 403);
      const { fullName, email, mobile, password, role, isActive = true } = body;
      if (typeof fullName !== 'string' || fullName.trim().length < 2 || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) return json({ error: 'Enter a valid name, email, and a password of at least 8 characters.' }, 400);
      if (role === 'SUPER_ADMIN' && !await hasPermission('roles.assign')) return json({ error: 'Only a Super Admin can create another Super Admin.' }, 403);
      const { data, error } = await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(), password, email_confirm: true,
        user_metadata: { full_name: fullName.trim(), mobile: mobile?.trim() || null },
      });
      if (error || !data.user) return json({ error: error?.message || 'Unable to create Auth account.' }, 400);
      const id = data.user.id;
      newlyCreatedAuthUserId = id;
      const { error: activeError } = await admin.from('user_profiles').update({ is_active: !!isActive, mobile: mobile?.trim() || null }).eq('id', id);
      if (activeError) throw activeError;
      await assignRole(id, role);
      const createdUser = await userJson(id);
      newlyCreatedAuthUserId = null;
      return json({ user: createdUser }, 201);
    }

    const { userId } = body;
    if (typeof userId !== 'string') return json({ error: 'A valid user ID is required.' }, 400);
    const isOwner = await targetIsSuperAdmin(userId);
    if (isOwner && !await hasPermission('roles.assign')) return json({ error: 'Only a Super Admin can change a Super Admin account.' }, 403);

    if (action === 'set_role') {
      if (!await requirePermission('roles.assign')) return json({ error: 'You do not have permission to assign roles.' }, 403);
      if (body.role === 'SUPER_ADMIN' && !await hasPermission('roles.assign')) return json({ error: 'Only a Super Admin can assign the Super Admin role.' }, 403);
      await assignRole(userId, body.role);
      return json({ user: await userJson(userId) });
    }
    if (action === 'set_active') {
      if (!await requirePermission('users.deactivate')) return json({ error: 'You do not have permission to change account status.' }, 403);
      if (isOwner && body.isActive === false) {
        const { data: owners } = await admin.from('user_roles').select('user_id, roles!inner(name)').eq('roles.name', 'SUPER_ADMIN');
        const activeOwnerIds = new Set((owners || []).map((row: any) => row.user_id));
        const { data: activeProfiles } = await admin.from('user_profiles').select('id').eq('is_active', true).in('id', [...activeOwnerIds]);
        if ((activeProfiles || []).length <= 1) return json({ error: 'Cannot deactivate the last active Super Admin.' }, 409);
      }
      const { error } = await admin.from('user_profiles').update({ is_active: !!body.isActive }).eq('id', userId);
      if (error) throw error;
      return json({ user: await userJson(userId) });
    }
    if (action === 'set_password') {
      if (!await requirePermission('users.update')) return json({ error: 'You do not have permission to reset passwords.' }, 403);
      if (typeof body.password !== 'string' || body.password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password: body.password });
      if (error) throw error;
      return json({ success: true });
    }
    if (action === 'update') {
      if (!await requirePermission('users.update')) return json({ error: 'You do not have permission to update users.' }, 403);
      const { fullName, email, mobile } = body;
      if (typeof fullName !== 'string' || fullName.trim().length < 2 || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid name and email.' }, 400);
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { email: email.trim().toLowerCase(), email_confirm: true, user_metadata: { full_name: fullName.trim(), mobile: mobile?.trim() || null } });
      if (authUpdateError) throw authUpdateError;
      const { error } = await admin.from('user_profiles').update({ full_name: fullName.trim(), email: email.trim().toLowerCase(), mobile: mobile?.trim() || null }).eq('id', userId);
      if (error) throw error;
      return json({ user: await userJson(userId) });
    }
    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    console.error('user-admin failed', error);
    if (newlyCreatedAuthUserId) await admin.auth.admin.deleteUser(newlyCreatedAuthUserId);
    return json({ error: error instanceof Error ? error.message : 'User administration failed.' }, 400);
  }
});
