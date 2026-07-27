// Supabase Edge Function — update-client v2
// Met à jour la fiche du client connecté : ses contacts, ses agences, son
// adresse. Appelée par le formulaire de demande de devis.
//
// La v1 lisait `client_id` dans le corps de la requête et écrivait avec la
// service_role sans vérifier quoi que ce soit : connaître l'identifiant d'un
// client suffisait pour modifier ou supprimer ses contacts et ses agences. La
// seule barrière était la vérification de jeton de la plateforme, que la clé
// publique du site — distribuée en clair dans le bundle JavaScript — suffit à
// franchir.
//
// Désormais le client est identifié par le jeton signé émis par `auth-client`,
// et toutes les écritures portent sur `token.sub`. Un `client_id` présent dans
// le corps de la requête est ignoré : il n'y a plus d'identifiant de cible
// fourni par l'appelant, donc plus rien à falsifier.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireClient } from '../_shared/crypto.ts';
import { json, preflight, requireSecret } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function broadcastClientUpdate(client_id: string) {
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
  } catch {
    // Non-bloquant : l'app interne utilisera le polling de secours
  }
}

// Opérations autorisées — jamais de lecture globale
const ALLOWED_OPERATIONS = [
  'add_contact', 'update_contact', 'delete_contact',
  'add_agence', 'update_agence', 'delete_agence',
  'update_adresse',
] as const;

type Operation = typeof ALLOWED_OPERATIONS[number];

interface Contact { id: string; [k: string]: unknown }
interface Agence { id: string; [k: string]: unknown }

/** Texte normalisé : pas de saut de ligne, longueur bornée. */
function texte(valeur: unknown, max: number): string {
  return String(valeur ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
}

// Contacts et agences sont stockés en jsonb. On reconstruit l'objet champ par
// champ au lieu de recopier le corps de la requête : le client ne peut donc pas
// glisser de clés arbitraires dans sa propre fiche, que le logiciel de la
// carrière relit ensuite.
const CHAMPS_CONTACT: Array<[string, number]> = [
  ['nom', 100], ['prenom', 100], ['telephone', 30], ['email', 200], ['fonction', 100],
];

const CHAMPS_AGENCE: Array<[string, number]> = [
  ['nom', 200], ['adresse', 300],
];

/**
 * En création, tous les champs sont posés. En modification, seuls ceux que la
 * requête porte réellement : le formulaire n'envoie pas la fonction du contact
 * lorsqu'il met à jour son nom, et l'absence d'un champ ne doit pas l'effacer.
 * Les clés inconnues, elles, sont écartées dans les deux cas.
 */
function normaliser(
  champs: Array<[string, number]>,
  data: Record<string, unknown>,
  id: string,
  partiel: boolean,
) {
  const objet: Record<string, string> = { id };
  for (const [cle, max] of champs) {
    if (partiel && !(cle in data)) continue;
    objet[cle] = texte(data[cle], max);
  }
  return objet;
}

/** Identifiant de contact / agence : accepté seulement s'il ressemble à un id. */
function identifiant(valeur: unknown): string | null {
  const id = texte(valeur, 64);
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  let jwtSecret: string;
  try {
    jwtSecret = requireSecret('CLIENT_JWT_SECRET');
  } catch (err) {
    console.error('Configuration invalide :', err);
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  const token = await requireClient(req, jwtSecret);
  if (!token) return json(401, { error: 'UNAUTHENTICATED' });

  // La cible est le client du jeton, jamais un identifiant fourni par l'appelant.
  const clientId = token.sub;

  let operation: string;
  let data: Record<string, unknown>;

  try {
    const body = await req.json();
    operation = String(body.operation ?? '').trim();
    data = (body.data ?? {}) as Record<string, unknown>;
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  if (!operation || typeof data !== 'object' || data === null) {
    return json(400, { error: 'MISSING_FIELDS' });
  }
  if (!ALLOWED_OPERATIONS.includes(operation as Operation)) {
    return json(400, { error: 'UNKNOWN_OPERATION' });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('clients')
    .select('id, contacts, agences, adresse')
    .eq('id', clientId)
    .single();

  // Le compte a disparu depuis l'émission du jeton (client supprimé côté
  // logiciel) : le jeton reste signé mais ne désigne plus rien.
  if (fetchErr || !existing) return json(404, { error: 'CLIENT_NOT_FOUND' });

  const contacts = (existing.contacts ?? []) as Contact[];
  const agences = (existing.agences ?? []) as Agence[];

  try {
    switch (operation as Operation) {
      case 'add_contact': {
        const id = identifiant(data.id) ?? crypto.randomUUID();
        await supabase
          .from('clients')
          .update({ contacts: [...contacts, normaliser(CHAMPS_CONTACT, data, id, false)] })
          .eq('id', clientId);
        break;
      }

      case 'update_contact': {
        const id = identifiant(data.id);
        if (!id) return json(400, { error: 'ID du contact manquant' });

        const maj = contacts.map((c) =>
          c.id === id ? { ...c, ...normaliser(CHAMPS_CONTACT, data, id, true) } : c
        );
        await supabase.from('clients').update({ contacts: maj }).eq('id', clientId);
        break;
      }

      case 'delete_contact': {
        const id = identifiant(data.id);
        if (!id) return json(400, { error: 'ID du contact manquant' });

        await supabase
          .from('clients')
          .update({ contacts: contacts.filter((c) => c.id !== id) })
          .eq('id', clientId);
        break;
      }

      case 'add_agence': {
        const id = identifiant(data.id) ?? crypto.randomUUID();
        await supabase
          .from('clients')
          .update({ agences: [...agences, normaliser(CHAMPS_AGENCE, data, id, false)] })
          .eq('id', clientId);
        break;
      }

      case 'update_agence': {
        const id = identifiant(data.id);
        if (!id) return json(400, { error: "ID de l'agence manquant" });

        const maj = agences.map((a) =>
          a.id === id ? { ...a, ...normaliser(CHAMPS_AGENCE, data, id, true) } : a
        );
        await supabase.from('clients').update({ agences: maj }).eq('id', clientId);
        break;
      }

      case 'delete_agence': {
        const id = identifiant(data.id);
        if (!id) return json(400, { error: "ID de l'agence manquant" });

        await supabase
          .from('clients')
          .update({ agences: agences.filter((a) => a.id !== id) })
          .eq('id', clientId);
        break;
      }

      case 'update_adresse': {
        await supabase
          .from('clients')
          .update({ adresse: texte(data.adresse, 300) })
          .eq('id', clientId);
        break;
      }
    }

    // Diffusion temps réel vers l'app interne (non bloquant)
    await broadcastClientUpdate(clientId);

    return json(200, { success: true });
  } catch (err) {
    console.error('Mise à jour échouée pour le client', clientId, err);
    return json(500, { error: 'UPDATE_FAILED' });
  }
});
