import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireClient } from '../_shared/crypto.ts';
import { json, preflight, requireSecret } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CibleAffaire = {
  demandeId: string | null;
  devisId: string | null;
  devisEtat: string | null;
};

function texteCourt(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
}

function texteMessage(value: unknown): string {
  return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, 2000);
}

function lireAffaireId(value: unknown): { prefixe: 'd' | 'q'; id: string } | null {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^([dq]):([A-Za-z0-9_-]{1,100})$/);
  return match ? { prefixe: match[1] as 'd' | 'q', id: match[2] } : null;
}

async function resoudreAffaire(affaireId: unknown, clientId: string): Promise<CibleAffaire | null> {
  const parsed = lireAffaireId(affaireId);
  if (!parsed) return null;

  if (parsed.prefixe === 'q') {
    const { data, error } = await supabase
      .from('devis')
      .select('id, etat')
      .eq('id', parsed.id)
      .eq('client_id', clientId)
      .maybeSingle();
    if (error) throw error;
    return data ? { demandeId: null, devisId: data.id, devisEtat: data.etat } : null;
  }

  const { data: demande, error: demandeError } = await supabase
    .from('demandes')
    .select('id')
    .eq('id', parsed.id)
    .eq('client_id', clientId)
    .maybeSingle();
  if (demandeError) throw demandeError;
  if (!demande) return null;

  const { data: devis, error: devisError } = await supabase
    .from('devis')
    .select('id, etat')
    .eq('demande_id', demande.id)
    .eq('client_id', clientId)
    .in('etat', ['envoye', 'accepte', 'refuse', 'planifie', 'termine'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (devisError) throw devisError;

  return {
    demandeId: demande.id,
    devisId: devis?.id ?? null,
    devisEtat: devis?.etat ?? null,
  };
}

async function verifier(error: unknown) {
  if (error) throw error;
}

async function diffuser(event: string, clientId: string, payload: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{
          topic: 'realtime:client-updates',
          event: 'broadcast',
          payload: { type: 'broadcast', event, payload: { client_id: clientId, ...payload } },
        }],
      }),
    });
  } catch {
    // La persistance fait foi ; le logiciel interne dispose aussi de son polling.
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  let jwtSecret: string;
  try {
    jwtSecret = requireSecret('CLIENT_JWT_SECRET');
  } catch (error) {
    console.error('Configuration invalide :', error);
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  const token = await requireClient(req, jwtSecret);
  if (!token) return json(401, { error: 'UNAUTHENTICATED' });

  let operation = '';
  let affaireId: unknown;
  let data: Record<string, unknown> = {};
  try {
    const body = await req.json();
    operation = String(body.operation ?? '').trim();
    affaireId = body.affaireId;
    data = (body.data ?? {}) as Record<string, unknown>;
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  try {
    const cible = await resoudreAffaire(affaireId, token.sub);
    if (!cible) return json(404, { error: 'AFFAIRE_NOT_FOUND' });

    if (operation === 'update_metadata') {
      const changements = {
        nom_chantier: texteCourt(data.nomChantier, 160) || null,
        reference_client: texteCourt(data.referenceClient, 100) || null,
      };
      const resultats = [];
      if (cible.demandeId) {
        resultats.push(await supabase.from('demandes').update(changements).eq('id', cible.demandeId));
      }
      if (cible.devisId) {
        resultats.push(await supabase.from('devis').update(changements).eq('id', cible.devisId));
      }
      for (const resultat of resultats) await verifier(resultat.error);
      await diffuser('client-affaire-updated', token.sub, { affaire_id: affaireId });
      return json(200, { success: true, ...changements });
    }

    if (operation === 'decide_quote') {
      if (!cible.devisId || cible.devisEtat !== 'envoye') {
        return json(409, { error: 'QUOTE_NOT_ACTIONABLE' });
      }
      const decision = String(data.decision ?? '');
      if (!['accepte', 'refuse', 'modification_demandee'].includes(decision)) {
        return json(400, { error: 'INVALID_DECISION' });
      }
      const message = texteMessage(data.message);
      if (decision === 'modification_demandee' && message.length < 5) {
        return json(400, { error: 'MESSAGE_REQUIRED' });
      }

      const changements: Record<string, unknown> = {
        client_action: decision,
        client_action_at: new Date().toISOString(),
        client_action_message: message || null,
      };
      if (decision === 'accepte') changements.etat = 'accepte';
      if (decision === 'refuse') changements.etat = 'refuse';

      const { data: devisMisAJour, error } = await supabase
        .from('devis')
        .update(changements)
        .eq('id', cible.devisId)
        .eq('client_id', token.sub)
        .eq('etat', 'envoye')
        .select('id')
        .maybeSingle();
      await verifier(error);
      if (!devisMisAJour) return json(409, { error: 'QUOTE_ALREADY_PROCESSED' });

      if (message) {
        const { error: messageError } = await supabase.from('messages_affaire').insert({
          client_id: token.sub,
          demande_id: cible.demandeId,
          devis_id: cible.devisId,
          auteur: 'client',
          type: decision === 'modification_demandee' ? 'demande_modification' : 'message',
          contenu: message,
          lu_par_client_at: new Date().toISOString(),
        });
        await verifier(messageError);
      }

      await diffuser('client-quote-decision', token.sub, {
        affaire_id: affaireId,
        devis_id: cible.devisId,
        decision,
      });
      return json(200, { success: true, decision });
    }

    if (operation === 'send_message') {
      const contenu = texteMessage(data.contenu);
      if (!contenu) return json(400, { error: 'EMPTY_MESSAGE' });
      const { data: message, error } = await supabase
        .from('messages_affaire')
        .insert({
          client_id: token.sub,
          demande_id: cible.demandeId,
          devis_id: cible.devisId,
          auteur: 'client',
          type: 'message',
          contenu,
          lu_par_client_at: new Date().toISOString(),
        })
        .select('id, auteur, type, contenu, created_at')
        .single();
      await verifier(error);
      await diffuser('client-message-created', token.sub, { affaire_id: affaireId, message_id: message?.id });
      return json(200, {
        success: true,
        message: message ? {
          id: message.id,
          auteur: message.auteur,
          type: message.type,
          contenu: message.contenu,
          createdAt: message.created_at,
        } : null,
      });
    }

    if (operation === 'mark_messages_read') {
      const { data: messages, error: readError } = await supabase
        .from('messages_affaire')
        .select('id, demande_id, devis_id')
        .eq('client_id', token.sub)
        .eq('auteur', 'tvm38')
        .is('lu_par_client_at', null);
      await verifier(readError);
      const ids = (messages ?? [])
        .filter((message) =>
          (cible.demandeId && message.demande_id === cible.demandeId) ||
          (cible.devisId && message.devis_id === cible.devisId)
        )
        .map((message) => message.id);
      if (ids.length > 0) {
        const { error } = await supabase
          .from('messages_affaire')
          .update({ lu_par_client_at: new Date().toISOString() })
          .in('id', ids);
        await verifier(error);
      }
      return json(200, { success: true });
    }

    return json(400, { error: 'UNKNOWN_OPERATION' });
  } catch (error) {
    console.error('Action client impossible :', error);
    return json(500, { error: 'ACTION_FAILED' });
  }
});
