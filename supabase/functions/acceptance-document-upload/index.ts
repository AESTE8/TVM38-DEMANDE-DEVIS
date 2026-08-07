// Supabase Edge Function — acceptance-document-upload v1
//
// Réception du justificatif d'acceptation d'un devis : soit le devis signé et
// daté, soit le bon de commande correspondant.
//
// Le dépôt ne vaut PAS acceptation. Le devis reste à l'état `envoye` et attend
// le contrôle d'un opérateur : c'est la carrière qui engage la carrière.
//
//   POST /functions/v1/acceptance-document-upload
//   Authorization: Bearer <JWT client de l'espace personnel>
//   Content-Type: multipart/form-data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireClient } from '../_shared/crypto.ts';
import { json, preflight, requireSecret } from '../_shared/http.ts';
import { deleteFile, downloadPdf, uploadNewFile } from '../_shared/google-drive.ts';
import { envoyerEmail } from '../_shared/mailer.ts';
import { construireEmail, echapper, SITE_URL } from '../_shared/emailTemplate.ts';
import { signAccesToken } from '../_shared/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MAX_BYTES = Number(Deno.env.get('ACCEPTANCE_MAX_BYTES') || 15 * 1024 * 1024);

/**
 * Texte des confirmations cochées par le client. Sa version est archivée avec
 * le document : on doit pouvoir dire, des mois plus tard, ce qui a exactement
 * été approuvé — un texte modifié depuis ne prouverait plus rien.
 */
const VERSION_CONFIRMATIONS = '2026-08';

const DOSSIERS: Record<string, { secret: string; type: string }> = {
  devis_signe: { secret: 'GOOGLE_DRIVE_SIGNED_QUOTES_FOLDER_ID', type: 'devis_signes' },
  bon_commande: { secret: 'GOOGLE_DRIVE_PURCHASE_ORDERS_FOLDER_ID', type: 'bons_commande' },
};

/** Correspondance code d'erreur PostgreSQL/métier vers statut HTTP. */
const STATUTS: Record<string, number> = {
  AFFAIRE_NOT_FOUND: 404,
  QUOTE_NOT_ACTIONABLE: 409,
  QUOTE_VERSION_CHANGED: 409,
  ACCEPTANCE_ALREADY_VALIDATED: 409,
};

function texteCourt(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
}

function adresseIp(req: Request): string {
  const chaine = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  return chaine.split(',')[0].trim().slice(0, 60);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  return Array.from(digest, (valeur) => valeur.toString(16).padStart(2, '0')).join('');
}

/**
 * Un PDF commence par `%PDF-`. Le contrôle porte sur les octets réels, pas sur
 * l'extension ni sur le type déclaré par le navigateur : les deux se changent
 * en une seconde, le contenu non.
 */
function estPdf(bytes: Uint8Array): boolean {
  return bytes.length > 5
    && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44
    && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

/** Compte approximatif des pages, à titre indicatif dans la file de contrôle. */
function compterPages(bytes: Uint8Array): number | null {
  const texte = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 4_000_000)));
  const correspondances = texte.match(/\/Type\s*\/Page[^s]/g);
  return correspondances ? correspondances.length : null;
}

function nomStockage(numero: string, version: number, type: string, referenceBc: string): string {
  // Les marques diacritiques sont retirées via une propriété Unicode plutôt
  // qu'une plage de caractères écrite en dur : la plage se copie mal d'un
  // éditeur à l'autre et finit par ne plus rien filtrer du tout.
  const nettoyer = (valeur: string, max: number) =>
    valeur.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);

  const horodatage = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const court = crypto.randomUUID().slice(0, 8);
  const base = nettoyer(numero || 'DEVIS', 40);

  return type === 'bon_commande'
    ? `BON_COMMANDE_${base}_V${version}_${nettoyer(referenceBc, 30) || 'SANS-REF'}_${horodatage}_${court}.pdf`
    : `DEVIS_SIGNE_${base}_V${version}_${horodatage}_${court}.pdf`;
}

/**
 * Texte exploitable d'une erreur, quelle qu'en soit la forme.
 *
 * supabase-js ne lève pas une `Error` mais un objet simple `{ message, details,
 * hint, code }`. Un `String(err)` dessus donne « [object Object] » : aucun code
 * métier ni contrainte n'y est reconnaissable, et tout finissait en 500 — y
 * compris un simple doublon qui aurait dû répondre par un succès.
 */
function texteErreur(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const details = err as { message?: string; details?: string; hint?: string; code?: string };
    const morceaux = [details.message, details.details, details.hint, details.code].filter(Boolean);
    if (morceaux.length > 0) return morceaux.join(' | ');
  }
  return String(err);
}

function messageErreur(err: unknown): string {
  const brut = texteErreur(err);
  const connu = Object.keys(STATUTS).find((code) => brut.includes(code));
  return connu ?? brut;
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
  if (!token) {
    // Répondre sans avoir lu le corps laisse le navigateur téléverser dans le
    // vide : la connexion cale au lieu de recevoir le 401, et l'utilisateur
    // voit une erreur réseau incompréhensible au bout d'une minute. On draine
    // avant de refuser.
    await req.arrayBuffer().catch(() => undefined);
    return json(401, { error: 'UNAUTHENTICATED' });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(400, { error: 'INVALID_FORM_DATA' });
  }

  const devisId = texteCourt(form.get('devisId'), 100);
  const typeDocument = texteCourt(form.get('typeDocument'), 20);
  const referenceBc = texteCourt(form.get('referenceBonCommande'), 60);
  const transmetteurNom = texteCourt(form.get('transmetteurNom'), 160);
  const transmetteurEmail = texteCourt(form.get('transmetteurEmail'), 160);
  const transmetteurFonction = texteCourt(form.get('transmetteurFonction'), 160);
  const transmetteurAgence = texteCourt(form.get('transmetteurAgence'), 160);
  const commentaireClient = String(form.get('commentaireClient') ?? '').trim().slice(0, 2000);
  const confirmationCorrespondance = String(form.get('confirmationCorrespondance')) === 'true';
  const confirmationHabilitation = String(form.get('confirmationHabilitation')) === 'true';
  const convertiDepuisImages = String(form.get('convertiDepuisImages')) === 'true';
  const fichier = form.get('file');

  if (!devisId) return json(400, { error: 'MISSING_QUOTE' });
  const dossier = DOSSIERS[typeDocument];
  if (!dossier) return json(400, { error: 'INVALID_DOCUMENT_TYPE' });
  if (typeDocument === 'bon_commande' && referenceBc.length < 2) {
    return json(400, { error: 'PURCHASE_ORDER_REFERENCE_REQUIRED' });
  }
  if (transmetteurNom.length < 3) return json(400, { error: 'SENDER_NAME_REQUIRED' });
  // Sans adresse, TVM38 ne peut pas répondre au client : le contrôle
  // aboutirait sans que personne ne l'apprenne.
  if (!/^\S+@\S+\.\S+$/.test(transmetteurEmail)) return json(400, { error: 'SENDER_EMAIL_REQUIRED' });
  if (!confirmationCorrespondance || !confirmationHabilitation) {
    return json(400, { error: 'CONFIRMATIONS_REQUIRED' });
  }
  if (!(fichier instanceof File)) return json(400, { error: 'FILE_REQUIRED' });
  if (fichier.size === 0) return json(400, { error: 'FILE_REQUIRED' });
  if (fichier.size > MAX_BYTES) return json(413, { error: 'FILE_TOO_LARGE', maxBytes: MAX_BYTES });

  // Aucun repli silencieux sur le dossier principal : un justificatif rangé
  // au milieu des devis serait introuvable au moment où on en a besoin.
  const dossierId = (Deno.env.get(dossier.secret) || '').trim();
  if (!dossierId) {
    console.error(`${dossier.secret} manquant — dépôt refusé`);
    return json(500, { error: 'SERVER_MISCONFIGURED', detail: dossier.secret });
  }

  const bytes = new Uint8Array(await fichier.arrayBuffer());
  if (!estPdf(bytes)) return json(400, { error: 'INVALID_PDF' });

  // L'état lu ici fait foi ; ce que le navigateur croyait savoir n'entre pas
  // dans la décision. Il sera revérifié sous verrou juste avant l'insertion.
  const { data: devis, error: devisError } = await supabase
    .from('devis')
    .select('id, numero_devis, client_id, demande_id, etat, document_version, pdf_sha256, drive_file_id, acceptation_status')
    .eq('id', devisId)
    .eq('client_id', token.sub)
    .maybeSingle();

  if (devisError) {
    console.error('Lecture du devis échouée', devisError);
    return json(500, { error: 'SERVER_ERROR' });
  }
  if (!devis) return json(404, { error: 'AFFAIRE_NOT_FOUND' });
  if (devis.etat !== 'envoye') return json(409, { error: 'QUOTE_NOT_ACTIONABLE' });
  if (!devis.drive_file_id) return json(409, { error: 'PDF_UNAVAILABLE' });

  // Les devis envoyés avant la mise en place du versionnement n'ont pas
  // d'empreinte : elle n'était calculée qu'au dépôt du PDF par le logiciel. On
  // la relève ici plutôt que d'exiger que la carrière ré-enregistre ses 44
  // devis en cours un par un pour débloquer leurs clients.
  let empreinteDevis = devis.pdf_sha256;
  if (!empreinteDevis) {
    try {
      empreinteDevis = await sha256Hex(await downloadPdf(devis.drive_file_id));
      await supabase.from('devis').update({ pdf_sha256: empreinteDevis }).eq('id', devis.id);
    } catch (err) {
      console.error('Empreinte du devis illisible', devisId, err);
      return json(502, { error: 'PDF_UNAVAILABLE' });
    }
  }

  const sha256 = await sha256Hex(bytes);
  const nomDrive = nomStockage(devis.numero_devis, devis.document_version, typeDocument, referenceBc);

  let driveFileId: string;
  try {
    driveFileId = await uploadNewFile(bytes, nomDrive, dossierId, 'application/pdf');
  } catch (err) {
    console.error('Dépôt Drive échoué pour le devis', devisId, err);
    await supabase.from('evenements_dossier').insert({
      client_id: token.sub,
      devis_id: devisId,
      devis_version: devis.document_version,
      type: 'acceptance_document_upload_failed',
      acteur: 'client',
      acteur_id: token.sub,
      adresse_ip: adresseIp(req) || null,
      donnees: { etape: 'drive', message: String(err).slice(0, 500) },
    });
    // Le client ne doit jamais croire que son document est arrivé.
    return json(502, { error: 'UPLOAD_FAILED' });
  }

  try {
    const { data, error } = await supabase.rpc('enregistrer_document_acceptation', {
      p_client_id: token.sub,
      p_devis_id: devisId,
      p_devis_version: devis.document_version,
      p_devis_pdf_sha256: empreinteDevis,
      p_type_document: typeDocument,
      p_drive_file_id: driveFileId,
      p_drive_folder_type: dossier.type,
      p_nom_fichier_original: texteCourt(fichier.name, 255) || 'document.pdf',
      p_nom_fichier_drive: nomDrive,
      p_mime_type: 'application/pdf',
      p_taille_octets: bytes.length,
      p_sha256: sha256,
      p_nb_pages: compterPages(bytes),
      p_converti: convertiDepuisImages,
      p_reference_bc: referenceBc,
      p_transmetteur_nom: transmetteurNom,
      p_transmetteur_email: transmetteurEmail,
      p_transmetteur_fonction: transmetteurFonction,
      p_transmetteur_agence: transmetteurAgence,
      p_version_texte_confirmation: VERSION_CONFIRMATIONS,
      p_commentaire_client: commentaireClient,
      p_adresse_ip: adresseIp(req),
      p_user_agent: String(req.headers.get('user-agent') || '').slice(0, 300),
    });
    if (error) throw error;

    await diffuser(token.sub, devisId, data);

    // Accusé de réception. Volontairement après l'enregistrement, et sans
    // await bloquant sur son échec : le document est déjà en base, un serveur
    // SMTP en panne ne doit pas transformer un dépôt réussi en erreur.
    const destinataire = transmetteurEmail || (await emailDuCompte(token.sub));
    if (destinataire) {
      const compte = await identifiantsDuCompte(token.sub);
      const lien = await lienAcces(token.sub, jwtSecret, affaireDuDevis(devis.id, devis.demande_id));

      await envoyerEmail(
        destinataire,
        `Document reçu — devis ${devis.numero_devis || devisId}`,
        construireEmail({
          titre: 'Nous avons bien reçu votre document',
          sousTitre: `Devis ${devis.numero_devis || devisId} · version ${devis.document_version}`,
          corps:
            `<p style="margin:0 0 16px">Bonjour ${echapper(transmetteurNom)},</p>` +
            `<p style="margin:0 0 16px">Votre ${typeDocument === 'bon_commande' ? 'bon de commande' : 'devis signé'} nous est bien parvenu. ` +
            'Il va être vérifié par nos équipes avant la confirmation définitive de votre commande.</p>' +
            '<p style="margin:0;color:#526176;font-size:13px">Vous serez averti dès que cette vérification sera faite. ' +
            'Tant qu’elle n’a pas eu lieu, le devis reste en attente et vous pouvez encore nous transmettre un autre document.</p>',
          encadre: {
            intitule: typeDocument === 'bon_commande' ? 'Bon de commande transmis' : 'Devis signé transmis',
            valeur: referenceBc || fichier.name,
          },
          bouton: { libelle: 'Suivre mon dossier', url: lien },
          lienSecondaire: { libelle: 'Accéder à tous mes dossiers', url: `${SITE_URL}/` },
          identifiants: compte,
          rappelEspace: true,
        }),
      );
    }

    return json(200, {
      success: true,
      documentId: data.documentId,
      statut: data.statut,
      devisVersion: data.devisVersion,
      documentsRemplaces: data.documentsRemplaces,
    });
  } catch (err) {
    // La transaction a été annulée : le fichier déposé n'est rattaché à rien.
    // On le retire pour ne pas laisser d'orphelin dans le Drive de la carrière.
    const supprime = await deleteFile(driveFileId);
    const brut = texteErreur(err);
    const code = messageErreur(err);
    console.error(
      'Enregistrement du document échoué pour le devis', devisId,
      '- fichier Drive', driveFileId, supprime ? 'supprimé' : 'ORPHELIN À NETTOYER',
      brut,
    );

    // Un doublon n'est pas une erreur pour le client : c'est un double clic, ou
    // le même fichier renvoyé pour la même version. Son document est déjà là,
    // on le lui confirme plutôt que de l'inquiéter.
    if (brut.includes('documents_acceptation_doublon_idx') || brut.includes('23505')) {
      return json(200, { success: true, deja: true });
    }

    const statut = STATUTS[code] ?? 500;
    return json(statut, { error: statut === 500 ? 'SERVER_ERROR' : code });
  }
});

/** Adresse de repli quand le déposant n'a pas renseigné la sienne. */
async function emailDuCompte(clientId: string): Promise<string> {
  const { data } = await supabase.from('clients').select('email').eq('id', clientId).maybeSingle();
  return String(data?.email || '').trim();
}

/** Identifiants rappelés dans l'e-mail, comme dans celui d'envoi du devis. */
async function identifiantsDuCompte(clientId: string) {
  const { data } = await supabase
    .from('clients').select('identifiant, password').eq('id', clientId).maybeSingle();
  return data?.identifiant
    ? { identifiant: String(data.identifiant), motDePasse: String(data.password ?? '') }
    : undefined;
}

/** Identifiant d'affaire du portail : `d:` s'il vient d'une demande, `q:` sinon. */
function affaireDuDevis(devisId: string, demandeId?: string | null): string {
  return demandeId ? `d:${demandeId}` : `q:${devisId}`;
}

/**
 * Lien de connexion directe, valable 30 jours. Le mot de passe reste dans le
 * corps du message et ne circule jamais dans une URL.
 */
async function lienAcces(clientId: string, secret: string, affaire: string): Promise<string> {
  const jeton = await signAccesToken({ sub: clientId, affaire }, secret, 30 * 24 * 60 * 60);
  return `${SITE_URL}/acces?t=${encodeURIComponent(jeton)}`;
}

async function diffuser(clientId: string, devisId: string, data: { documentId?: string }) {
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
          topic: 'realtime:client-actions-updates',
          event: 'acceptance-document-uploaded',
          payload: { client_id: clientId, devis_id: devisId, document_id: data.documentId },
        }],
      }),
    });
  } catch {
    // La persistance fait foi ; le logiciel a son polling de secours.
  }
}
