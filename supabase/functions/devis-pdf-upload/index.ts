// Supabase Edge Function — devis-pdf-upload v1
// Appelée par le logiciel de la carrière à chaque enregistrement d'un devis.
// Dépose (ou écrase) le PDF dans le Drive partagé et mémorise son identifiant.
//
// Le logiciel n'a AUCUN accès à Google : il envoie le PDF ici, l'edge function
// détient seule la clé du compte de service. Un poste compromis ne donne pas
// accès au Drive de l'entreprise.
//
// Appel attendu :
//   POST /functions/v1/devis-pdf-upload
//   Authorization: Bearer <jeton de session du logiciel, celui qu'il envoie
//                          déjà à sa fonction `devis`>
//   { "devisId": "...", "fileName": "26TVM0064.pdf", "pdfBase64": "..." }
//
// ⚠️ À appeler à CHAQUE enregistrement, pas uniquement au premier envoi :
// sinon le montant affiché dans l'espace client serait à jour alors que le PDF
// téléchargeable resterait celui d'avant modification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { uploadNewFile, uploadPdf } from '../_shared/google-drive.ts';
import { requireOperateur } from '../_shared/crypto.ts';
import { json, preflight } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 15 Mo — un devis granulats fait quelques dizaines de Ko, cette borne ne sert
// qu'à empêcher qu'une erreur côté logiciel ne sature la fonction.
const MAX_PDF_BYTES = 15 * 1024 * 1024;

function decodeBase64(value: string): Uint8Array {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  return Array.from(digest, (valeur) => valeur.toString(16).padStart(2, '0')).join('');
}

function nomFige(numero: string, version: number): string {
  const base = (numero || 'DEVIS').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60);
  return `${base}_V${version}.pdf`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
  if (!folderId) {
    console.error('GOOGLE_DRIVE_FOLDER_ID manquant');
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  // Le logiciel de la carrière signe ses propres jetons — il n'a pas de compte
  // Supabase Auth. On vérifie donc le même jeton que sa fonction `devis`.
  const operateur = await requireOperateur(req, SUPABASE_SERVICE_ROLE_KEY);
  if (!operateur) return json(401, { error: 'UNAUTHENTICATED' });

  let devisId: string;
  let fileName: string;
  let pdfBase64: string;

  try {
    const body = await req.json();
    devisId = String(body.devisId ?? '').trim();
    fileName = String(body.fileName ?? '').trim();
    pdfBase64 = String(body.pdfBase64 ?? '');
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  if (!devisId || !pdfBase64) return json(400, { error: 'MISSING_FIELDS' });

  const { data: devis, error } = await supabase
    .from('devis')
    .select('id, numero_devis, client_id, etat, drive_file_id, document_version, montant_total_ht')
    .eq('id', devisId)
    .maybeSingle();

  if (error || !devis) return json(404, { error: 'DEVIS_NOT_FOUND' });

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(pdfBase64);
  } catch {
    return json(400, { error: 'INVALID_PDF' });
  }

  if (bytes.length === 0) return json(400, { error: 'INVALID_PDF' });
  if (bytes.length > MAX_PDF_BYTES) return json(413, { error: 'PDF_TOO_LARGE' });

  // Nom lisible dans le Drive pour l'archivage interne de la carrière.
  const nom = fileName || `${devis.numero_devis || devis.id}.pdf`;
  const version = Number(devis.document_version || 1);
  const pdfSha256 = await sha256Hex(bytes);

  try {
    // Un devis pas encore transmis n'est qu'un brouillon : on continue
    // d'écraser son fichier de travail, personne ne s'est engagé dessus.
    if (devis.etat !== 'envoye') {
      const fileId = await uploadPdf(bytes, nom, folderId, devis.drive_file_id);
      await supabase
        .from('devis')
        .update({
          drive_file_id: fileId,
          drive_updated_at: new Date().toISOString(),
          pdf_sha256: pdfSha256,
        })
        .eq('id', devisId);
      return json(200, { success: true, driveFileId: fileId, pdfSha256, version, fige: false });
    }

    // À partir de l'envoi, la version est figée. Le logiciel appelant à chaque
    // enregistrement, on ne redépose rien tant que le contenu est identique :
    // sinon chaque sauvegarde fabriquerait un fichier Drive de plus.
    const { data: versionExistante } = await supabase
      .from('devis_versions')
      .select('id, drive_file_id, pdf_sha256')
      .eq('devis_id', devis.id)
      .eq('version_number', version)
      .maybeSingle();

    if (versionExistante?.pdf_sha256 === pdfSha256) {
      await supabase
        .from('devis')
        .update({ drive_file_id: versionExistante.drive_file_id, pdf_sha256: pdfSha256 })
        .eq('id', devisId);
      return json(200, {
        success: true,
        driveFileId: versionExistante.drive_file_id,
        pdfSha256,
        version,
        fige: true,
        inchange: true,
      });
    }

    const fileId = await uploadNewFile(bytes, nomFige(devis.numero_devis, version), folderId);

    const { error: versionError } = await supabase.from('devis_versions').upsert({
      devis_id: devis.id,
      client_id: devis.client_id,
      version_number: version,
      numero_devis: devis.numero_devis || '',
      drive_file_id: fileId,
      pdf_sha256: pdfSha256,
      montant_total_ht: devis.montant_total_ht || 0,
      sent_at: new Date().toISOString(),
    }, { onConflict: 'devis_id,version_number' });
    if (versionError) throw versionError;

    await supabase
      .from('devis')
      .update({
        drive_file_id: fileId,
        drive_updated_at: new Date().toISOString(),
        pdf_sha256: pdfSha256,
      })
      .eq('id', devisId);

    return json(200, { success: true, driveFileId: fileId, pdfSha256, version, fige: true });
  } catch (err) {
    console.error('Dépôt Drive échoué pour le devis', devisId, err);

    // Le message de Google est remonté tel quel. C'est le seul endroit où l'on
    // apprend *pourquoi* le dépôt échoue — dossier introuvable, compte de
    // service non membre du Drive, portée insuffisante — et sans lui la panne
    // est indiagnosticable depuis le logiciel. Cette réponse ne part que vers
    // un opérateur authentifié, jamais vers un client.
    const detail = (err instanceof Error ? err.message : String(err)).slice(0, 600);
    return json(502, { error: 'DRIVE_UPLOAD_FAILED', detail });
  }
});
