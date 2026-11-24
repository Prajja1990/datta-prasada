const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve(request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  return new Response(JSON.stringify({
    error: 'Legacy password login has been retired. Sign in with your Supabase Auth password or ask an administrator to reset it.',
  }), { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } });
});
