import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@3.0.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Authentication service is not configured.' }, 500);

  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
      return json({ error: 'Enter a valid email and password.' }, 400);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: limitError } = await admin.rpc('allow_legacy_auth_attempt', {
      p_email: email,
    });
    if (limitError) {
      console.error('Legacy login throttle failed:', limitError.message);
      return json({ error: 'Unable to verify credentials. Apply the auth bridge migration and retry.' }, 500);
    }
    if (!allowed) return json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);

    const { data: account, error: accountError } = await admin.from('user_accounts')
      .select('full_name, email, mobile, roles, password_hash, is_active')
      .eq('email', email)
      .maybeSingle();
    if (accountError) throw accountError;
    const passwordMatches = !!account?.is_active && !!account.password_hash && await bcrypt.compare(password, account.password_hash);
    if (!passwordMatches) return json({ error: 'Invalid email or password.' }, 401);

    const { error: clearError } = await admin.rpc('clear_legacy_auth_attempts', { p_email: email });
    if (clearError) throw clearError;

    let authUserId: string | null = null;
    const { data: profile } = await admin.from('user_profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    authUserId = profile?.id || null;

    // Recover accounts created before profile-sync was installed.
    if (!authUserId) {
      for (let page = 1; page <= 100; page += 1) {
        const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 100 });
        if (listError) throw listError;
        const found = listed.users.find((user) => user.email?.toLowerCase() === email);
        if (found) {
          authUserId = found.id;
          break;
        }
        if (listed.users.length < 100) break;
      }
    }

    if (authUserId) {
      const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: account.full_name, mobile: account.mobile || null },
      });
      if (updateError) throw updateError;
      const { error: profileError } = await admin.from('user_profiles').upsert({
        id: authUserId,
        full_name: account.full_name,
        mobile: account.mobile || null,
        email,
        is_active: true,
      }, { onConflict: 'id' });
      if (profileError) throw profileError;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: account.full_name, mobile: account.mobile || null },
      });
      if (createError || !created.user) throw createError || new Error('Could not create Auth user.');
      authUserId = created.user.id;
      const { error: profileError } = await admin.from('user_profiles').upsert({
        id: authUserId,
        full_name: account.full_name,
        mobile: account.mobile || null,
        email,
        is_active: true,
      }, { onConflict: 'id' });
      if (profileError) throw profileError;
    }

    const roleNames = Array.isArray(account.roles)
      ? account.roles.filter((role: unknown): role is string => typeof role === 'string')
      : [];
    if (roleNames.length === 0) throw new Error('The legacy account has no assigned role.');
    const { data: roles, error: rolesError } = await admin.from('roles').select('id, name').in('name', roleNames);
    if (rolesError) throw rolesError;
    if (!roles || roles.length !== new Set(roleNames).size) throw new Error('One or more legacy roles are missing from public.roles.');

    const { error: removeRolesError } = await admin.from('user_roles').delete().eq('user_id', authUserId);
    if (removeRolesError) throw removeRolesError;
    const { error: assignRolesError } = await admin.from('user_roles').insert(
      roles.map((role) => ({ user_id: authUserId, role_id: role.id })),
    );
    if (assignRolesError) throw assignRolesError;

    return json({ success: true });
  } catch (error) {
    console.error('legacy-login failed:', error);
    return json({ error: 'Unable to complete sign-in. Check the account setup and try again.' }, 500);
  }
});
