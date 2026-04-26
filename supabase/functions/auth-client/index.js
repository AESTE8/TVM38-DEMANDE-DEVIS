// Supabase Edge Function — auth-client v1
// Authentifie un client du site web par identifiant + password.
// Utilise service_role pour contourner RLS et comparer côté serveur.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST')
        return json(405, { error: 'METHOD_NOT_ALLOWED' });
    let identifiant;
    let password;
    try {
        const body = await req.json();
        identifiant = (body.identifiant ?? '').trim();
        password = (body.password ?? '').trim();
    }
    catch {
        return json(400, { error: 'INVALID_JSON' });
    }
    if (!identifiant || !password) {
        return json(400, { error: 'MISSING_FIELDS' });
    }
    const { data: client, error } = await supabase
        .from('clients')
        .select('id, nom, prenom, code, type, email, telephone, adresse, contacts, agences, liste_noire, password')
        .eq('identifiant', identifiant)
        .single();
    if (error || !client) {
        return json(401, { error: 'INVALID_CREDENTIALS' });
    }
    if (client.liste_noire === true) {
        return json(403, { error: 'ACCOUNT_SUSPENDED' });
    }
    if (client.password !== password) {
        return json(401, { error: 'INVALID_CREDENTIALS' });
    }
    // Ne jamais renvoyer le password au frontend
    const { password: _pw, liste_noire: _lb, ...safeClient } = client;
    return json(200, { success: true, client: safeClient });
});
