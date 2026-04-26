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
async function broadcastClientUpdate(client_id) {
    try {
        await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
                messages: [{
                        topic: 'realtime:client-updates',
                        event: 'broadcast',
                        payload: {
                            type: 'broadcast',
                            event: 'client-updated',
                            payload: { client_id },
                        },
                    }],
            }),
        });
    }
    catch {
        // Non-bloquant : l'app interne utilisera le polling de secours
    }
}
// Opérations autorisées — jamais de lecture globale, jamais de suppression
const ALLOWED_OPERATIONS = ['add_contact', 'update_contact', 'add_agence', 'update_agence', 'update_adresse'];
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST')
        return json(405, { error: 'METHOD_NOT_ALLOWED' });
    let client_id;
    let operation;
    let data;
    try {
        const body = await req.json();
        client_id = (body.client_id ?? '').trim();
        operation = (body.operation ?? '').trim();
        data = body.data;
    }
    catch {
        return json(400, { error: 'INVALID_JSON' });
    }
    if (!client_id || !operation || !data)
        return json(400, { error: 'MISSING_FIELDS' });
    if (!ALLOWED_OPERATIONS.includes(operation))
        return json(400, { error: 'UNKNOWN_OPERATION' });
    // Vérifier que le client existe avant toute modification
    const { data: existing, error: fetchErr } = await supabase
        .from('clients')
        .select('id, contacts, agences, adresse')
        .eq('id', client_id)
        .single();
    if (fetchErr || !existing)
        return json(404, { error: 'CLIENT_NOT_FOUND' });
    try {
        switch (operation) {
            case 'add_contact': {
                const contacts = existing.contacts || [];
                await supabase.from('clients').update({ contacts: [...contacts, data] }).eq('id', client_id);
                break;
            }
            case 'update_contact': {
                const contacts = (existing.contacts || []).map((c) => c.id === data.id ? { ...c, nom: data.nom, prenom: data.prenom, telephone: data.telephone, email: data.email } : c);
                await supabase.from('clients').update({ contacts }).eq('id', client_id);
                break;
            }
            case 'add_agence': {
                const agences = existing.agences || [];
                await supabase.from('clients').update({ agences: [...agences, data] }).eq('id', client_id);
                break;
            }
            case 'update_agence': {
                const agences = (existing.agences || []).map((a) => a.id === data.id ? { ...a, nom: data.nom, adresse: data.adresse } : a);
                await supabase.from('clients').update({ agences }).eq('id', client_id);
                break;
            }
            case 'update_adresse': {
                await supabase.from('clients').update({ adresse: data.adresse }).eq('id', client_id);
                break;
            }
        }
        // Diffusion temps réel vers l'app interne (non bloquant)
        await broadcastClientUpdate(client_id);
        return json(200, { success: true });
    }
    catch {
        return json(500, { error: 'UPDATE_FAILED' });
    }
});
