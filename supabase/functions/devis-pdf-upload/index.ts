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
//   Authorization: Bearer <access_token Supabase du dispatcher connecté>
//   { "devisId": "...", "fileName": "26TVM0064.pdf", "pdfBase64": "..." }
//
// ⚠️ À appeler à CHAQUE enregistrement, pas uniquement au premier envoi :
// sinon le montant affiché dans l'espace client serait à jour alors que le PDF
// téléchargeable resterait celui d'avant modification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { uploadPdf } from '../_shared/google-drive.ts';
import { json, preflight } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 15 Mo — un devis granulats fait quelques dizaines de Ko, cette borne ne sert
// qu'à empêcher qu'une erreur côté logiciel ne sature la fonction.
const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** Le PDF ne peut être déposé que par un opérateur authentifié dans le logiciel. */
async function operateurAutorise(req: Request): Promise<boolean> {
  const header = req.headers.get('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const { data, error } = await supabase.auth.getUser(match[1].trim());
  return !error && Boolean(data?.user);
}

function decodeBase64(value: string): Uint8Array {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
  if (!folderId) {
    console.error('GOOGLE_DRIVE_FOLDER_ID manquant');
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  if (!(await operateurAutorise(req))) {
    return json(401, { error: 'UNAUTHENTICATED' });
  }

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
    .select('id, numero_devis, drive_file_id')
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

  try {
    const fileId = await uploadPdf(bytes, nom, folderId, devis.drive_file_id);

    await supabase
      .from('devis')
      .update({ drive_file_id: fileId, drive_updated_at: new Date().toISOString() })
      .eq('id', devisId);

    return json(200, { success: true, driveFileId: fileId });
  } catch (err) {
    console.error('Dépôt Drive échoué pour le devis', devisId, err);
    return json(502, { error: 'DRIVE_UPLOAD_FAILED' });
  }
});
