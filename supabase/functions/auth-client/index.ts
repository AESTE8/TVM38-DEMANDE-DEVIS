// Supabase Edge Function — auth-client v2
// Authentifie un client du site web (identifiant + mot de passe) et délivre un
// jeton signé utilisé ensuite par l'espace client.
//
// Deux évolutions par rapport à la v1 :
//  1. Les mots de passe sont vérifiés contre un hash PBKDF2, plus par égalité
//     de chaînes sur une valeur stockée en clair.
//  2. Le frontend reçoit un JWT HS256 signé au lieu d'un objet client brut :
//     bricoler le localStorage ne permet plus de se faire passer pour un autre
//     client, ce qui devient critique dès lors qu'on expose des montants.
//
// Migration transparente : tant qu'un compte n'a pas de `password_hash`, on
// compare à l'ancien `password` en clair puis on écrit le hash au vol. Aucun
// client n'a de mot de passe à réinitialiser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hashPassword, signClientToken, verifyAccesToken, verifyPassword } from '../_shared/crypto.ts';
import { json, preflight, requireSecret } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 7 jours — aligné sur la durée de session que le site pratiquait déjà.
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

  let identifiant: string;
  let password: string;
  let jetonAcces: string;

  try {
    const body = await req.json();
    identifiant = (body.identifiant ?? '').trim();
    password = (body.password ?? '').trim();
    jetonAcces = String(body.accesToken ?? '').trim();
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  const COLONNES = 'id, nom, prenom, code, type, identifiant, email, telephone, adresse, contacts, agences, liste_noire, password, password_hash';

  // ---------------------------------------------------------------------
  // Connexion par lien d'e-mail
  // ---------------------------------------------------------------------
  // Le lien porte un jeton signé, jamais le mot de passe. Il est échangé ici
  // contre une session ordinaire : le jeton d'accès lui-même n'est accepté
  // par aucune autre fonction.
  if (jetonAcces) {
    const acces = await verifyAccesToken(jetonAcces, jwtSecret);
    if (!acces) return json(401, { error: 'ACCES_LINK_INVALID' });

    const { data: client, error } = await supabase
      .from('clients').select(COLONNES).eq('id', acces.sub).maybeSingle();
    if (error || !client) return json(401, { error: 'ACCES_LINK_INVALID' });
    if (client.liste_noire === true) return json(403, { error: 'ACCOUNT_SUSPENDED' });

    const token = await signClientToken(
      { sub: client.id, code: client.code, nom: client.nom },
      jwtSecret,
      TOKEN_TTL_SECONDS,
    );

    return json(200, {
      success: true,
      client: clientPublic(client),
      token,
      expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
      affaire: acces.affaire ?? null,
    });
  }

  if (!identifiant || !password) {
    return json(400, { error: 'MISSING_FIELDS' });
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select(COLONNES)
    .eq('identifiant', identifiant)
    .maybeSingle();

  if (error || !client) {
    return json(401, { error: 'INVALID_CREDENTIALS' });
  }

  if (client.liste_noire === true) {
    return json(403, { error: 'ACCOUNT_SUSPENDED' });
  }

  // Vérification du mot de passe
  let authenticated = false;

  if (client.password_hash) {
    authenticated = await verifyPassword(password, client.password_hash);
  } else if (client.password) {
    // Compte pas encore migré : on compare à l'ancienne valeur en clair, et si
    // elle est bonne on en profite pour écrire le hash définitivement.
    authenticated = client.password === password;

    if (authenticated) {
      try {
        const hash = await hashPassword(password);
        await supabase.from('clients').update({ password_hash: hash }).eq('id', client.id);
      } catch (err) {
        // La connexion reste valide même si l'écriture du hash échoue :
        // le compte sera simplement migré à la prochaine tentative.
        console.error('Migration du hash échouée pour', client.id, err);
      }
    }
  }

  if (!authenticated) {
    return json(401, { error: 'INVALID_CREDENTIALS' });
  }

  const token = await signClientToken(
    { sub: client.id, code: client.code, nom: client.nom },
    jwtSecret,
    TOKEN_TTL_SECONDS,
  );

  return json(200, {
    success: true,
    client: clientPublic(client),
    token,
    expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
  });
});

/**
 * Champs exposables d'un client.
 *
 * On énumère explicitement ce qui sort plutôt que d'exclure des champs : une
 * colonne sensible ajoutée plus tard à `clients` ne se retrouvera pas exposée
 * par inadvertance. Ni le mot de passe, ni son hash, ni la liste noire.
 */
function clientPublic(client: Record<string, unknown>) {
  return {
    id: client.id,
    nom: client.nom,
    prenom: client.prenom,
    code: client.code,
    type: client.type,
    identifiant: client.identifiant,
    email: client.email,
    telephone: client.telephone,
    adresse: client.adresse,
    contacts: client.contacts,
    agences: client.agences,
  };
}
