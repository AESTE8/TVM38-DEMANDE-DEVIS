// Supabase Edge Function — devis
// CRUD sécurisé sur la table `devis` via service_role.
// RLS active sur `devis` : la clé anon ne peut plus lire/écrire directement.
//
// Endpoints (dispatch sur body.action) :
//   - list   : { action:'list' }               → { devis: [...] }
//   - insert : { action:'insert', row: {...} }  → { devis: {...} }
//   - update : { action:'update', id, row }     → { devis: {...} }
//   - delete : { action:'delete', id }          → { success: true }
//       Réservé aux brouillons `en_attente`. 409 DEVIS_TRANSMIS sinon.
//   - archive : { action:'archive', id }        → { devis: {...} }
//   - demandes_list : { action:'demandes_list' } → { demandes: [...] }
//   - demande_update_statut :
//       { action:'demande_update_statut', id, statut } → { demande: {...} }
//   - messages_inbox_list / messages_unread_list / messages_thread
//   - messages_mark_read / messages_mark_handled / conversation_archive / message_send
//
// Toutes les actions exigent un JWT valide. insert/update/delete bloqués pour spectateur.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { affaireId, lienAcces } from '../_shared/accesLink.ts';
import { pieceJointeQr, QR_CID, qrCodeBase64 } from '../_shared/qrCode.ts';
import { deleteFile, uploadNewFile } from '../_shared/googleDrive.ts';
import { construireEmail, construireTexte, echapper, GabaritEmail, SITE_URL } from '../_shared/emailTemplate.ts';
import { envoyerEmail } from '../_shared/mailer.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AUTH_JWT_SECRET = SUPABASE_SERVICE_ROLE_KEY ? `tvm38-auth-v1:${SUPABASE_SERVICE_ROLE_KEY}` : '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MESSAGE_SELECT = 'id, client_id, demande_id, devis_id, auteur, type, contenu, lu_par_client_at, lu_par_tvm38_at, lu_par_tvm38_by, traite_par_tvm38_at, traite_par_tvm38_by, created_at';

/**
 * Colonnes que le logiciel ne doit jamais écrire par un enregistrement de devis.
 *
 * Elles appartiennent au parcours client : dépôt d'un justificatif, contrôle
 * interne, versionnement du document. Le logiciel envoie l'intégralité du devis
 * à chaque sauvegarde, à partir d'une copie chargée parfois plusieurs heures
 * plus tôt — il écrasait donc l'action d'un client qui venait de déposer son
 * bon de commande, faisant disparaître la carte de contrôle de la messagerie.
 *
 * Le filtre est ici, et pas seulement dans le logiciel : une version ancienne
 * installée sur un poste continuerait sinon d'effacer ces colonnes.
 */
const COLONNES_PARCOURS_CLIENT = [
  'client_action', 'client_action_at', 'client_action_message',
  'client_action_seen_at', 'client_action_seen_by',
  'client_action_handled_at', 'client_action_handled_by',
  'client_conversation_archived_at', 'client_conversation_archived_by',
  'acceptation_status', 'document_acceptation_actif_id', 'acceptation_requested_at',
  'acceptation_validated_at', 'acceptation_validated_by',
  'document_version', 'pdf_sha256', 'remplace_par_devis_id',
];

function sansColonnesDuParcoursClient(row: Record<string, unknown>): Record<string, unknown> {
  if (!row) return row;
  const propre: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(row)) {
    if (!COLONNES_PARCOURS_CLIENT.includes(cle)) propre[cle] = valeur;
  }
  return propre;
}

/**
 * Progression normale d'un devis. `archive` et `refuse` n'y figurent pas : ce
 * sont des sorties de piste délibérées, atteignables depuis n'importe où.
 */
const RANG_ETAT: Record<string, number> = {
  en_attente: 0, envoye: 1, accepte: 2, planifie: 3, termine: 4,
};

/** Vrai si passer de `actuel` à `vise` ferait reculer le devis. */
function reculDEtat(actuel: string, vise: string): boolean {
  const depuis = RANG_ETAT[actuel];
  const vers = RANG_ETAT[vise];
  if (depuis === undefined || vers === undefined) return false;
  return vers < depuis;
}

type DecisionControle = 'valide' | 'regularisation_demandee' | 'rejete';

/**
 * Suite annoncée au client, selon la nature du devis.
 *
 * « Convenir de la date de livraison » n'a aucun sens pour un enlèvement en
 * carrière ou une mise en décharge : le client se demande de quelle livraison
 * on parle.
 */
function prochaineEtape(typeDevis: string): string {
  switch (typeDevis) {
    case 'fourniture':
      return 'convenir de la date d’enlèvement en carrière';
    case 'decharge':
      return 'convenir de la date de dépôt de vos matériaux';
    case 'livraison_decharge':
      return 'convenir de la date d’intervention';
    default:
      return 'convenir de la date de livraison';
  }
}

/**
 * Encadré reprenant le motif saisi par l'opérateur.
 *
 * Le motif était volontairement retenu dans l'espace client, pour créer une
 * raison de s'y connecter. C'est le seul endroit du parcours où la rétention se
 * retourne contre nous : un client dont le bon de commande vient d'être refusé
 * veut savoir pourquoi tout de suite. Sans l'explication sous les yeux, il ne se
 * connecte pas — il appelle, parce qu'un refus sans motif se vit comme un
 * problème. On perdait le portail ET on prenait l'appel.
 *
 * L'espace reste l'endroit où l'on agit : c'est le bouton qui y renvoie.
 */
function blocMotif(motif: string): string {
  if (!motif.trim()) return '';
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-left:3px solid #0053a1;background:#f0f6ff">' +
    '<tr><td style="padding:14px 16px">' +
    '<div style="margin-bottom:5px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">Motif</div>' +
    `<div style="font-size:14px;line-height:1.6;color:#172033">${echapper(motif.trim())}</div>` +
    '</td></tr></table>';
}

/** Ce que chaque décision raconte au client. */
const NOTIFICATIONS: Record<DecisionControle, {
  sujet: (numero: string) => string;
  titre: string;
  corps: (numero: string, typeDevis: string, motif: string) => string;
  bouton: string;
}> = {
  valide: {
    sujet: (numero) => `Votre commande est confirmée — devis ${numero}`,
    titre: 'Votre commande est confirmée',
    corps: (numero, typeDevis) =>
      `<p style="margin:0 0 16px">Nous avons vérifié le document que vous nous avez transmis pour le devis ${echapper(numero)}.</p>` +
      '<p style="margin:0 0 16px"><strong>Votre acceptation est validée</strong> et votre commande est enregistrée. ' +
      `Nous revenons vers vous pour ${prochaineEtape(typeDevis)}.</p>`,
    bouton: 'Suivre mon dossier',
  },
  regularisation_demandee: {
    sujet: (numero) => `Document à corriger — devis ${numero}`,
    titre: 'Votre document doit être corrigé',
    corps: (numero, _typeDevis, motif) =>
      `<p style="margin:0 0 16px">Le document transmis pour le devis ${echapper(numero)} n'a pas pu être validé en l'état.</p>` +
      blocMotif(motif) +
      '<p style="margin:0 0 16px">Le bouton ci-dessous ouvre le dossier : vous pouvez y déposer le document corrigé directement, ' +
      'une photo prise au téléphone suffit.</p>',
    bouton: 'Déposer un document corrigé',
  },
  rejete: {
    sujet: (numero) => `Document non retenu — devis ${numero}`,
    titre: 'Votre document n’a pas pu être accepté',
    corps: (numero, _typeDevis, motif) =>
      `<p style="margin:0 0 16px">Le document transmis pour le devis ${echapper(numero)} n'a pas pu être accepté.</p>` +
      blocMotif(motif) +
      '<p style="margin:0 0 16px">Vous pouvez déposer un nouveau document depuis le dossier, ou nous joindre si vous préférez en parler.</p>',
    bouton: 'Ouvrir le dossier',
  },
};

/**
 * Liens discrets sous le bouton : l'espace entier, et une nouvelle demande.
 *
 * Ils pointaient vers la racine du site, donc vers un écran de connexion — un
 * client qui voulait simplement redemander un devis devait retrouver ses
 * identifiants dans un vieil e-mail. Portés par le même jeton signé que le
 * bouton, ils ouvrent l'espace et le formulaire sans rien taper.
 *
 * Sans secret de portail configuré, on n'émet rien plutôt qu'un lien mort.
 */
async function liensEspace(clientId: string, secret: string) {
  if (!secret) return [{ libelle: 'Accéder à mon espace', url: `${SITE_URL}/` }];
  return [
    { libelle: 'Accéder à tous mes dossiers', url: await lienAcces(clientId, secret, undefined, 'dossiers') },
    { libelle: 'Faire une nouvelle demande', url: await lienAcces(clientId, secret, undefined, 'nouvelle-demande') },
  ];
}

/**
 * Envoie un e-mail client à partir du gabarit partagé.
 *
 * Passe systématiquement par `construireTexte` : la version texte brut ne doit
 * jamais dépendre du fait que l'appelant y ait pensé.
 */
function envoyerGabarit(
  destinataire: string,
  sujet: string,
  gabarit: GabaritEmail,
  qr: string,
): Promise<boolean> {
  return envoyerEmail(
    destinataire,
    sujet,
    construireEmail(gabarit),
    pieceJointeQr(qr),
    construireTexte(gabarit),
  );
}

async function sha256Hex(octets: Uint8Array): Promise<string> {
  const entree = octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', entree));
  return Array.from(digest, (v) => v.toString(16).padStart(2, '0')).join('');
}

function nomStockageJustificatif(numero: string, version: number, type: string, referenceBc: string): string {
  const nettoyer = (valeur: string, max: number) =>
    valeur.normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
  const horodatage = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const court = crypto.randomUUID().slice(0, 8);
  const base = nettoyer(numero || 'DEVIS', 40);
  return type === 'bon_commande'
    ? `BON_COMMANDE_${base}_V${version}_${nettoyer(referenceBc, 30) || 'SANS-REF'}_${horodatage}_${court}.pdf`
    : `DEVIS_SIGNE_${base}_V${version}_${horodatage}_${court}.pdf`;
}

/**
 * Prévient le client qu'un justificatif reçu hors ligne a été enregistré.
 *
 * Le texte diffère selon que le devis vient d'être accepté ou non : recevoir
 * « votre commande est confirmée » une seconde fois sur un dossier déjà acté
 * inquiète plus que ça ne rassure.
 */
async function notifierDepotOperateur(
  devisId: string,
  typeDocument: string,
  referenceBc: string,
  devisAccepte: boolean,
) {
  try {
    const { data: devis } = await supabase
      .from('devis')
      .select('id, numero_devis, demande_id, client_id, email_contact')
      .eq('id', devisId).maybeSingle();
    if (!devis?.client_id) return { envoye: false, raison: 'DOCUMENT_INTROUVABLE' as const };

    const { data: client } = await supabase
      .from('clients').select('email, identifiant').eq('id', devis.client_id).maybeSingle();

    const destinataire = [devis.email_contact, client?.email]
      .map((v) => String(v ?? '').trim())
      .find((v) => /^\S+@\S+\.\S+$/.test(v));
    if (!destinataire) return { envoye: false, raison: 'AUCUNE_ADRESSE' as const };

    const numero = String(devis.numero_devis || devisId);
    const libelle = typeDocument === 'bon_commande'
      ? `Bon de commande${referenceBc ? ` ${referenceBc}` : ''}`
      : 'Devis signé';

    const secret = Deno.env.get('CLIENT_JWT_SECRET') ?? '';
    let lien = `${SITE_URL}/`;
    let qr = '';
    if (secret) {
      lien = await lienAcces(devis.client_id, secret, affaireId(devis.id, devis.demande_id));
      qr = await qrCodeBase64(lien);
    }

    const sujet = devisAccepte
      ? `Votre commande est confirmée — devis ${numero}`
      : `Document bien reçu — devis ${numero}`;

    const envoye = await envoyerGabarit(destinataire, sujet, {
      titre: devisAccepte ? 'Votre commande est confirmée' : 'Document bien reçu',
      sousTitre: `Devis ${numero}`,
      corps: devisAccepte
        ? `<p style="margin:0 0 16px">Nous avons bien reçu votre ${echapper(libelle.toLowerCase())} pour le devis ${echapper(numero)}.</p>`
          + '<p style="margin:0 0 16px"><strong>Votre commande est enregistrée.</strong> Nous revenons vers vous pour convenir de la date de livraison.</p>'
        : `<p style="margin:0 0 16px">Nous avons bien reçu votre ${echapper(libelle.toLowerCase())} pour le devis ${echapper(numero)}.</p>`
          + '<p style="margin:0 0 16px">Il a été <strong>archivé au dossier</strong>. Votre commande, déjà confirmée, suit son cours normalement.</p>',
      encadre: { intitule: 'Document enregistré', valeur: libelle },
      bouton: { libelle: 'Suivre mon dossier', url: lien },
      lienSecondaire: await liensEspace(devis.client_id, secret),
      qrCodeCid: qr ? QR_CID : undefined,
      // Pas de bloc identifiants : le bouton porte un lien signé qui connecte
      // directement, et l'identifiant seul ne permet de se connecter nulle part
      // ailleurs — l'encadré le prétendait pourtant. Les identifiants complets
      // ne partent que sur les e-mails qui ouvrent l'accès.
    }, qr);
    return { envoye, destinataire: envoye ? destinataire : undefined, raison: envoye ? undefined : 'SMTP_ECHEC' as const };
  } catch (err) {
    console.error('[notifierDepotOperateur]', err);
    return { envoye: false, raison: 'ERREUR' as const };
  }
}

/**
 * Prévient le client de la décision prise sur son justificatif.
 *
 * Ne lève jamais : la décision est déjà enregistrée quand on arrive ici, et un
 * serveur SMTP en panne ne doit pas la faire échouer. Le résultat remonte à
 * l'opérateur pour qu'il sache si le client a réellement été averti — sans quoi
 * il croirait la personne prévenue alors que rien n'est parti.
 */
async function notifierClient(documentId: string, decision: DecisionControle, motif = '') {
  try {
    const { data: doc } = await supabase
      .from('documents_acceptation')
      .select('devis_id, client_id, transmetteur_email, devis_numero')
      .eq('id', documentId)
      .maybeSingle();
    if (!doc) return { envoye: false, raison: 'DOCUMENT_INTROUVABLE' };

    const { data: devis } = await supabase
      .from('devis')
      .select('id, numero_devis, demande_id, email_contact, montant_total_ht, type_devis')
      .eq('id', doc.devis_id)
      .maybeSingle();

    const { data: client } = await supabase
      .from('clients')
      .select('email, identifiant')
      .eq('id', doc.client_id)
      .maybeSingle();

    // Le déposant d'abord : c'est lui qui attend la réponse. À défaut le
    // contact du devis, puis la fiche client.
    const destinataire = [doc.transmetteur_email, devis?.email_contact, client?.email]
      .map((valeur) => String(valeur ?? '').trim())
      .find((valeur) => /^\S+@\S+\.\S+$/.test(valeur));

    if (!destinataire) return { envoye: false, raison: 'AUCUNE_ADRESSE' };

    const secret = Deno.env.get('CLIENT_JWT_SECRET') ?? '';
    const numero = String(devis?.numero_devis || doc.devis_numero || doc.devis_id);
    const modele = NOTIFICATIONS[decision];

    let lien = `${SITE_URL}/`;
    let qr = '';
    if (secret) {
      lien = await lienAcces(doc.client_id, secret, affaireId(doc.devis_id, devis?.demande_id));
      qr = await qrCodeBase64(lien);
    }

    const envoye = await envoyerGabarit(destinataire, modele.sujet(numero), {
      titre: modele.titre,
      sousTitre: `Devis ${numero}`,
      corps: modele.corps(numero, String(devis?.type_devis ?? ''), motif),
      bouton: { libelle: modele.bouton, url: lien },
      lienSecondaire: await liensEspace(doc.client_id, secret),
      qrCodeCid: qr ? QR_CID : undefined,
      // Pas de rappel de l'espace ici : enchaîner « Demander un devis » sur un
      // document refusé se lit très mal, et les trois puces répétées à chaque
      // notification finissaient sautées d'office.
    }, qr);
    return { envoye, destinataire: envoye ? destinataire : undefined, raison: envoye ? undefined : 'SMTP_ECHEC' };
  } catch (err) {
    console.error('[notifierClient]', err);
    return { envoye: false, raison: 'ERREUR' };
  }
}

/**
 * Prévient le client que TVM38 a répondu à son message.
 *
 * Sans cet e-mail, la messagerie était à sens unique en pratique : le client
 * posait une question, la réponse arrivait dans son espace, et il n'avait aucun
 * moyen de le savoir — il attendait, puis il appelait.
 *
 * Le contenu du message n'est délibérément pas recopié. C'est le seul endroit
 * du parcours où la rétention est justifiée : une conversation se lit dans son
 * fil, avec ce qui précède, et l'espace est le seul endroit où l'on peut y
 * répondre. L'e-mail sert à savoir qu'il y a quelque chose à lire, pas à le
 * remplacer.
 *
 * Ne lève jamais : le message est déjà enregistré quand on arrive ici.
 */
async function notifierReponseMessage(devisId: string) {
  try {
    const { data: devis } = await supabase
      .from('devis')
      .select('id, numero_devis, demande_id, client_id, email_contact')
      .eq('id', devisId).maybeSingle();
    if (!devis?.client_id) return { envoye: false, raison: 'DEVIS_INTROUVABLE' as const };

    const { data: client } = await supabase
      .from('clients').select('email, identifiant').eq('id', devis.client_id).maybeSingle();

    const destinataire = [devis.email_contact, client?.email]
      .map((v) => String(v ?? '').trim())
      .find((v) => /^\S+@\S+\.\S+$/.test(v));
    if (!destinataire) return { envoye: false, raison: 'AUCUNE_ADRESSE' as const };

    const numero = String(devis.numero_devis || devisId);
    const secret = Deno.env.get('CLIENT_JWT_SECRET') ?? '';
    let lien = `${SITE_URL}/`;
    let qr = '';
    if (secret) {
      lien = await lienAcces(devis.client_id, secret, affaireId(devis.id, devis.demande_id));
      qr = await qrCodeBase64(lien);
    }

    const envoye = await envoyerGabarit(destinataire, `Réponse de TVM38 — devis ${numero}`, {
      titre: 'Vous avez une réponse',
      sousTitre: `Devis ${numero}`,
      corps: `<p style="margin:0 0 16px">Nous avons répondu à votre message sur le devis ${echapper(numero)}.</p>` +
        '<p style="margin:0 0 16px">Vous pouvez lire la réponse et poursuivre la conversation depuis le dossier.</p>',
      bouton: { libelle: 'Lire la réponse', url: lien },
      lienSecondaire: await liensEspace(devis.client_id, secret),
      qrCodeCid: qr ? QR_CID : undefined,
    }, qr);

    return { envoye, destinataire: envoye ? destinataire : undefined, raison: envoye ? undefined : 'SMTP_ECHEC' as const };
  } catch (err) {
    console.error('[notifierReponseMessage]', err);
    return { envoye: false, raison: 'ERREUR' as const };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getJwtKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(AUTH_JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

interface SessionClaims {
  sub: string;
  identifiant: string;
  role: 'developpeur' | 'utilisateur' | 'spectateur';
  exp: number;
  iat: number;
}

async function verifyToken(req: Request): Promise<SessionClaims | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const key = await getJwtKey();
    const payload = await verify(m[1], key) as unknown as SessionClaims;
    return payload;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const claims = await verifyToken(req);
  if (!claims) return json(401, { error: 'Non autorisé' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Corps de requête invalide' });
  }

  const action = body.action as string;

  if (action === 'list') {
    const { data, error } = await supabase
      .from('devis')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return json(500, { error: 'Erreur serveur' });
    return json(200, { devis: data });
  }

  if (action === 'demandes_list') {
    const { data, error } = await supabase
      .from('demandes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[demandes_list]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { demandes: data });
  }

  if (action === 'messages_unread_list') {
    const { data, error } = await supabase
      .from('messages_affaire')
      .select(MESSAGE_SELECT)
      .eq('auteur', 'client')
      .is('lu_par_tvm38_at', null)
      .not('devis_id', 'is', null)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[messages_unread_list]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { messages: data ?? [] });
  }

  if (action === 'messages_inbox_list') {
    const { data, error } = await supabase
      .from('messages_affaire')
      .select(MESSAGE_SELECT)
      .not('devis_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5000);
    if (error) {
      console.error('[messages_inbox_list]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { messages: data ?? [] });
  }

  if (action === 'messages_thread') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    if (!devisId || devisId.length > 100) return json(400, { error: 'devisId invalide' });
    const { data, error } = await supabase
      .from('messages_affaire')
      .select(MESSAGE_SELECT)
      .eq('devis_id', devisId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[messages_thread]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { messages: data ?? [] });
  }

  // Justificatifs d'acceptation transmis par les clients (devis signé ou bon de
  // commande). Lecture seule : `drive_file_id` n'est jamais renvoyé, l'ouverture
  // passe par la fonction acceptance-document-pdf à partir du seul identifiant.
  if (action === 'acceptance_documents_list') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    let requete = supabase
      .from('documents_acceptation')
      .select(
        'id, devis_id, devis_numero, devis_version, type_document, reference_bon_commande, ' +
        'nom_fichier_original, taille_octets, nb_pages, sha256, statut, transmetteur_nom, ' +
        'transmetteur_email, transmetteur_fonction, transmetteur_agence, commentaire_client, ' +
        'commentaire_controle, adresse_ip, depose_at, controle_at, controle_par_nom',
      )
      .order('depose_at', { ascending: false })
      .limit(1000);
    if (devisId) requete = requete.eq('devis_id', devisId);

    const { data, error } = await requete;
    if (error) {
      console.error('[acceptance_documents_list]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { documents: data ?? [] });
  }

  // Lien de connexion directe pour les e-mails construits par le logiciel.
  // Le renderer ne peut pas signer lui-même : le secret du portail n'a rien à
  // faire sur un poste, et un exécutable se décompile.
  if (action === 'acces_link') {
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    const demandeId = typeof body.demandeId === 'string' ? body.demandeId.trim() : '';
    if (!clientId) return json(400, { error: 'clientId requis' });

    const secret = Deno.env.get('CLIENT_JWT_SECRET') ?? '';
    if (!secret) return json(500, { error: 'CLIENT_JWT_SECRET absent' });

    // `vers` laisse le logiciel demander l'espace complet ou le formulaire de
    // nouvelle demande, sans avoir à connaître les routes du site.
    const vers = body.vers === 'dossiers' || body.vers === 'nouvelle-demande' ? body.vers : undefined;
    // `affaireId` renvoie `d:<demandeId>` dès qu'une demande existe : le devis
    // n'y entre pas. Exiger un `devisId` avant même de regarder `demandeId`
    // jetait donc un rattachement parfaitement valable — un devis né d'une
    // demande web perdait son lien alors que le portail savait l'ouvrir
    // (client-portal indexe ces dossiers sous `d:<demandeId>`).
    const affaire = devisId || demandeId
      ? affaireId(devisId, demandeId || null)
      : undefined;
    const lien = await lienAcces(clientId, secret, affaire, vers);
    // Base64 brut : le renderer le joint en pièce jointe `cid:`, comme le QR
    // d'avis Google. Une `data:` URI ne s'affiche pas dans Gmail.
    return json(200, { lien, qrCodeBase64: await qrCodeBase64(lien), cid: QR_CID, siteUrl: SITE_URL });
  }

  // Chronologie des décisions d'un dossier : versions publiées, dépôts,
  // contrôles. Le fil ne montrait que les messages, alors que la moitié de
  // l'histoire est ici.
  if (action === 'evenements_list') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    let requete = supabase
      .from('evenements_dossier')
      .select('id, devis_id, devis_version, document_id, type, acteur, acteur_nom, donnees, created_at')
      .order('created_at', { ascending: true })
      .limit(2000);
    if (devisId) requete = requete.eq('devis_id', devisId);

    const { data, error } = await requete;
    if (error) {
      console.error('[evenements_list]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { evenements: data ?? [] });
  }

  if (claims.role === 'spectateur') {
    return json(403, { error: 'Accès en lecture seule' });
  }

  // Justificatif reçu hors ligne (courrier, e-mail, main propre) et versé au
  // dossier par un opérateur. Vaut contrôle : on ne verse pas au dossier un
  // document qu'on n'a pas lu.
  if (action === 'acceptance_operator_upload') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    const typeDocument = typeof body.typeDocument === 'string' ? body.typeDocument : '';
    const referenceBc = typeof body.referenceBonCommande === 'string' ? body.referenceBonCommande.trim().slice(0, 60) : '';
    const commentaire = typeof body.commentaire === 'string' ? body.commentaire.trim().slice(0, 2000) : '';
    const nomFichier = typeof body.nomFichier === 'string' ? body.nomFichier.trim().slice(0, 255) : 'document.pdf';
    const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : '';
    const prevenirClient = body.prevenirClient !== false;
    const mode = body.mode === 'ajouter' ? 'ajouter' : 'remplacer';

    if (!devisId) return json(400, { error: 'devisId requis' });
    if (!['devis_signe', 'bon_commande'].includes(typeDocument)) return json(400, { error: 'Type de document invalide' });
    if (typeDocument === 'bon_commande' && referenceBc.length < 2) {
      return json(400, { error: 'Référence du bon de commande requise' });
    }
    if (!pdfBase64) return json(400, { error: 'Fichier manquant' });

    let octets: Uint8Array;
    try {
      const propre = pdfBase64.includes(',') ? pdfBase64.slice(pdfBase64.indexOf(',') + 1) : pdfBase64;
      octets = Uint8Array.from(atob(propre), (c) => c.charCodeAt(0));
    } catch {
      return json(400, { error: 'Fichier illisible' });
    }
    if (octets.length === 0 || octets.length > 15 * 1024 * 1024) {
      return json(413, { error: 'Fichier vide ou trop volumineux (15 Mo maximum)' });
    }
    // Les octets font foi, pas l'extension : un fichier renommé en .pdf n'en est pas un.
    if (!(octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46)) {
      return json(400, { error: 'Le fichier n’est pas un PDF' });
    }

    const dossierSecret = typeDocument === 'bon_commande'
      ? 'GOOGLE_DRIVE_PURCHASE_ORDERS_FOLDER_ID'
      : 'GOOGLE_DRIVE_SIGNED_QUOTES_FOLDER_ID';
    const dossierId = (Deno.env.get(dossierSecret) || '').trim();
    if (!dossierId) return json(500, { error: `${dossierSecret} manquant` });

    const { data: devis } = await supabase
      .from('devis').select('id, numero_devis, document_version, etat').eq('id', devisId).maybeSingle();
    if (!devis) return json(404, { error: 'Devis introuvable' });

    const nomDrive = nomStockageJustificatif(
      devis.numero_devis, devis.document_version ?? 1, typeDocument, referenceBc,
    );

    let driveFileId: string;
    try {
      driveFileId = await uploadNewFile(octets, nomDrive, dossierId);
    } catch (err) {
      console.error('[acceptance_operator_upload] Drive', err);
      return json(502, { error: 'Le dépôt sur le Drive a échoué' });
    }

    const { data, error } = await supabase.rpc('deposer_document_operateur', {
      p_devis_id: devisId,
      p_type_document: typeDocument,
      p_drive_file_id: driveFileId,
      p_drive_folder_type: typeDocument === 'bon_commande' ? 'bons_commande' : 'devis_signes',
      p_nom_fichier_original: nomFichier,
      p_nom_fichier_drive: nomDrive,
      p_taille_octets: octets.length,
      p_sha256: await sha256Hex(octets),
      p_nb_pages: null,
      p_reference_bc: referenceBc,
      p_commentaire: commentaire,
      p_operateur_id: claims.sub,
      p_operateur_nom: claims.identifiant,
      p_mode: mode,
    });

    if (error) {
      // La transaction est annulée : le fichier déposé n'est rattaché à rien.
      await deleteFile(driveFileId);
      const brut = String(error.message ?? '');
      const connus: Record<string, string> = {
        ETAT_NON_ELIGIBLE: 'Ce devis n’accepte pas de justificatif dans son état actuel.',
        DEVIS_SANS_CLIENT: 'Ce devis n’est rattaché à aucun compte client.',
        DEVIS_INTROUVABLE: 'Devis introuvable.',
        TYPE_INVALIDE: 'Type de document invalide.',
      };
      const trouve = Object.keys(connus).find((code) => brut.includes(code));
      if (trouve) return json(409, { error: connus[trouve] });
      console.error('[acceptance_operator_upload]', error);
      return json(500, { error: 'Erreur serveur' });
    }

    const resultat = data as { devisAccepte: boolean; documentId: string };
    const notification = prevenirClient
      ? await notifierDepotOperateur(devisId, typeDocument, referenceBc, resultat.devisAccepte)
      : { envoye: false, raison: 'DESACTIVE' as const };

    return json(200, { success: true, ...resultat, notification });
  }

  // Contrôle d'un justificatif : valider, demander une régularisation, rejeter.
  // Toute la transition passe par une fonction PostgreSQL — le devis ne doit
  // jamais devenir accepté sans que le document soit marqué validé.
  if (action === 'acceptance_review') {
    const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : '';
    const decision = typeof body.decision === 'string' ? body.decision : '';
    const commentaire = typeof body.commentaire === 'string' ? body.commentaire.trim().slice(0, 2000) : '';

    if (!/^[0-9a-f-]{36}$/i.test(documentId)) return json(400, { error: 'documentId invalide' });
    if (!['valide', 'regularisation_demandee', 'rejete'].includes(decision)) {
      return json(400, { error: 'Décision invalide' });
    }

    const { data, error } = await supabase.rpc('controler_document_acceptation', {
      p_document_id: documentId,
      p_decision: decision,
      p_commentaire: commentaire,
      p_operateur_id: claims.sub,
      p_operateur_nom: claims.identifiant,
    });

    if (error) {
      const brut = String(error.message ?? '');
      const connus: Record<string, [number, string]> = {
        COMMENTAIRE_REQUIS: [400, 'Un motif est obligatoire pour cette décision.'],
        DOCUMENT_INTROUVABLE: [404, 'Document introuvable.'],
        DOCUMENT_DEJA_TRAITE: [409, 'Ce document a déjà été contrôlé.'],
        VERSION_OBSOLETE: [409, 'Le devis a été modifié depuis ce dépôt : le document ne correspond plus.'],
        DEVIS_INTROUVABLE: [404, 'Devis introuvable.'],
      };
      const trouve = Object.keys(connus).find((code) => brut.includes(code));
      if (trouve) return json(connus[trouve][0], { error: connus[trouve][1] });
      console.error('[acceptance_review]', error);
      return json(500, { error: 'Erreur serveur' });
    }

    // La décision est enregistrée : la notification ne doit plus rien pouvoir
    // faire échouer. Son résultat est renvoyé au logiciel pour qu'il puisse
    // dire à l'opérateur si le client a réellement été prévenu.
    const notification = await notifierClient(documentId, decision, commentaire);

    return json(200, { success: true, ...(data as Record<string, unknown>), notification });
  }

  if (action === 'messages_mark_read') {
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100)
      : [];
    if (ids.length === 0) return json(200, { success: true });
    const { error } = await supabase
      .from('messages_affaire')
      .update({ lu_par_tvm38_at: new Date().toISOString(), lu_par_tvm38_by: claims.identifiant })
      .eq('auteur', 'client')
      .in('id', ids);
    if (error) {
      console.error('[messages_mark_read]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { success: true });
  }

  if (action === 'messages_mark_handled') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    const handled = body.handled === true;
    if (!devisId || devisId.length > 100 || typeof body.handled !== 'boolean') {
      return json(400, { error: 'devisId ou état invalide' });
    }
    const now = new Date().toISOString();
    const messageUpdate = handled
      ? {
          lu_par_tvm38_at: now,
          lu_par_tvm38_by: claims.identifiant,
          traite_par_tvm38_at: now,
          traite_par_tvm38_by: claims.identifiant,
        }
      : { traite_par_tvm38_at: null, traite_par_tvm38_by: null };
    const actionUpdate = handled
      ? { client_action_handled_at: now, client_action_handled_by: claims.identifiant }
      : {
          client_action_handled_at: null,
          client_action_handled_by: null,
          client_conversation_archived_at: null,
          client_conversation_archived_by: null,
        };
    const [{ error: messagesError }, { error: devisError }] = await Promise.all([
      supabase.from('messages_affaire').update(messageUpdate).eq('devis_id', devisId).eq('auteur', 'client'),
      supabase.from('devis').update(actionUpdate).eq('id', devisId),
    ]);
    if (messagesError || devisError) {
      console.error('[messages_mark_handled]', messagesError ?? devisError);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { success: true });
  }

  if (action === 'conversation_archive') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    const archived = body.archived === true;
    if (!devisId || devisId.length > 100 || typeof body.archived !== 'boolean') {
      return json(400, { error: 'devisId ou état invalide' });
    }
    const { error } = await supabase
      .from('devis')
      .update(archived
        ? {
            client_conversation_archived_at: new Date().toISOString(),
            client_conversation_archived_by: claims.identifiant,
          }
        : { client_conversation_archived_at: null, client_conversation_archived_by: null })
      .eq('id', devisId);
    if (error) {
      console.error('[conversation_archive]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { success: true });
  }

  if (action === 'message_send') {
    const devisId = typeof body.devisId === 'string' ? body.devisId.trim() : '';
    const contenu = typeof body.contenu === 'string' ? body.contenu.trim() : '';
    if (!devisId || devisId.length > 100 || !contenu || contenu.length > 2000) {
      return json(400, { error: 'devisId ou contenu invalide' });
    }
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select('id, client_id, demande_id')
      .eq('id', devisId)
      .maybeSingle();
    if (devisError || !devis?.client_id) return json(404, { error: 'Devis client introuvable' });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('messages_affaire')
      .insert({
        client_id: devis.client_id,
        demande_id: devis.demande_id,
        devis_id: devis.id,
        auteur: 'tvm38',
        type: 'message',
        contenu,
        lu_par_tvm38_at: now,
        lu_par_tvm38_by: claims.identifiant,
      })
      .select(MESSAGE_SELECT)
      .single();
    if (error) {
      console.error('[message_send]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    const [{ error: handledError }, { error: archiveError }] = await Promise.all([
      supabase
        .from('messages_affaire')
        .update({
          lu_par_tvm38_at: now,
          lu_par_tvm38_by: claims.identifiant,
          traite_par_tvm38_at: now,
          traite_par_tvm38_by: claims.identifiant,
        })
        .eq('devis_id', devisId)
        .eq('auteur', 'client'),
      supabase
        .from('devis')
        .update({ client_conversation_archived_at: null, client_conversation_archived_by: null })
        .eq('id', devisId),
    ]);
    if (handledError || archiveError) {
      console.error('[message_send:status]', handledError ?? archiveError);
    }

    // Le résultat remonte à l'opérateur : sans lui, il croirait le client
    // prévenu alors que rien n'est parti — exactement le cas où il n'aurait
    // pas relancé par téléphone.
    const notification = await notifierReponseMessage(devisId);

    return json(200, { message: data, notification });
  }

  if (action === 'demande_update_statut') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const statut = typeof body.statut === 'string' ? body.statut : '';
    const statutsAutorises = new Set(['envoyee', 'en_traitement', 'devisee', 'sans_suite']);
    if (!id || id.length > 100 || !statutsAutorises.has(statut)) {
      return json(400, { error: 'id ou statut invalide' });
    }

    const { data, error } = await supabase
      .from('demandes')
      .update({ statut })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('[demande_update_statut]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { demande: data });
  }

  // Rattache une demande envoyée en mode invité au compte client identifié
  // ensuite par le dispatcher. Sans cela, le client verrait son devis apparaître
  // comme s'il avait été créé au comptoir, sans l'étape « Demande envoyée » de
  // son suivi — alors que c'est bien lui qui l'a envoyée depuis le site.
  if (action === 'demande_rattacher_client') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
    if (!id || id.length > 100 || !clientId || clientId.length > 100) {
      return json(400, { error: 'id ou clientId invalide' });
    }

    // Le client doit exister : une clé étrangère invalide passerait sinon en
    // erreur serveur opaque côté logiciel.
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();
    if (clientErr || !client) return json(404, { error: 'Client introuvable' });

    const { data, error } = await supabase
      .from('demandes')
      .update({ client_id: clientId })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('[demande_rattacher_client]', error);
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { demande: data });
  }

  if (action === 'insert') {
    const row = sansColonnesDuParcoursClient(body.row as Record<string, unknown>);
    if (!row) return json(400, { error: 'row manquant' });
    const { data, error } = await supabase.from('devis').insert(row).select().single();
    if (error) return json(500, { error: 'Erreur serveur' });
    return json(200, { devis: data });
  }

  if (action === 'update') {
    const id = body.id as string;
    const row = body.row as Record<string, unknown>;
    if (!id || !row) return json(400, { error: 'id ou row manquant' });

    const propre = sansColonnesDuParcoursClient(row);

    // `etat` ne peut pas rejoindre la liste noire : le logiciel s'en sert pour
    // planifier et terminer. Mais il ne doit jamais reculer sur la foi d'un
    // formulaire ouvert une heure plus tôt. Le cas réel : l'opérateur ouvre un
    // devis « envoye », un client fait valider son bon de commande entre-temps
    // (devis « accepte »), et l'enregistrement le ramène à « envoye » — la
    // commande est décochée sans que personne ne s'en aperçoive.
    //
    // Le recul légitime existe, mais il est produit par le trigger de
    // versionnement quand le contenu change vraiment, jamais par la charge
    // utile. On peut donc refuser le recul sans rien casser.
    if (typeof propre.etat === 'string') {
      const { data: actuel } = await supabase
        .from('devis').select('etat').eq('id', id).maybeSingle();

      if (actuel?.etat && reculDEtat(String(actuel.etat), propre.etat)) {
        console.warn(
          'Recul d\'état ignoré sur le devis', id,
          ':', actuel.etat, '->', propre.etat, '(formulaire périmé)',
        );
        delete propre.etat;
      }
    }

    const { data, error } = await supabase
      .from('devis').update(propre).eq('id', id).select().single();
    if (error) {
      const refusTransport = [
        'Des livraisons restent à réaliser',
        'Des quantités du devis restent à répartir',
        'Utilisez les livraisons liées à Mi Planning pour modifier ce transport',
      ];
      if (refusTransport.includes(error.message)) return json(409, { error: error.message });
      return json(500, { error: 'Erreur serveur' });
    }
    return json(200, { devis: data });
  }

  /**
   * Suppression définitive — réservée aux brouillons.
   *
   * `delete from devis` emporte en cascade `documents_acceptation`,
   * `messages_affaire` et `devis_versions`, et met `evenements_dossier.devis_id`
   * à null. Sur un devis parti chez le client, cela détruit le devis signé ou le
   * bon de commande qu'il a transmis — la preuve de la commande — ainsi que
   * toute la conversation, sans que rien ne le laisse deviner : la confirmation
   * annonçait seulement « action irréversible ».
   *
   * Côté client c'est pire que muet, c'est trompeur. Un devis né d'une demande
   * web laisse la demande derrière lui : la carte retombe sur « En chiffrage »,
   * et le client dont la commande était confirmée revoit sa demande initiale
   * comme si personne n'avait répondu. Un devis créé directement disparaît de
   * l'espace, et les liens des e-mails déjà partis tombent sur « introuvable ».
   *
   * Le geste légitime existe : c'est l'archivage. `archive` est déjà un état
   * connu du portail, qui affiche « sans suite » et conserve tout.
   */
  if (action === 'delete') {
    const id = body.id as string;
    if (!id) return json(400, { error: 'id manquant' });

    const { data: cible, error: lectureErreur } = await supabase
      .from('devis').select('etat, numero_devis').eq('id', id).maybeSingle();
    if (lectureErreur) return json(500, { error: 'Erreur serveur' });
    // Déjà supprimé : le résultat voulu est atteint, pas la peine d'échouer.
    if (!cible) return json(200, { success: true });

    if (cible.etat !== 'en_attente') {
      return json(409, { error: 'DEVIS_TRANSMIS', etat: cible.etat });
    }

    // Filet : un justificatif sur un devis resté « en_attente » ne devrait pas
    // exister, mais s'il existe c'est une pièce du client. On ne l'efface pas.
    const { count } = await supabase
      .from('documents_acceptation')
      .select('id', { count: 'exact', head: true })
      .eq('devis_id', id);
    if ((count ?? 0) > 0) return json(409, { error: 'JUSTIFICATIF_PRESENT' });

    const { error } = await supabase.from('devis').delete().eq('id', id);
    if (error) return json(500, { error: 'Erreur serveur' });
    return json(200, { success: true });
  }

  /**
   * Archivage — ce qu'on veut réellement faire d'un devis abandonné.
   *
   * Rien n'est détruit : le justificatif, la conversation et l'historique des
   * montants restent. Le portail traite `archive` comme un état clos et affiche
   * « sans suite », au lieu de laisser la demande éternellement « en chiffrage ».
   */
  if (action === 'archive') {
    const id = body.id as string;
    if (!id) return json(400, { error: 'id manquant' });
    const { data, error } = await supabase
      .from('devis').update({ etat: 'archive' }).eq('id', id).select().single();
    if (error) return json(500, { error: 'Erreur serveur' });
    return json(200, { devis: data });
  }

  return json(400, { error: `Action inconnue: ${action}` });
});
