// Supabase Edge Function — acceptance-document-pdf v1
//
// Sert un justificatif d'acceptation (devis signé ou bon de commande) sans
// jamais exposer Google Drive.
//
// L'appelant ne fournit qu'un identifiant Supabase de document. Le fichier
// Drive est résolu côté serveur : accepter un `drive_file_id` venu du
// navigateur laisserait n'importe quel client authentifié réclamer n'importe
// quel fichier du Drive de la carrière.
//
//   GET /functions/v1/acceptance-document-pdf?documentId=...
//   Authorization: Bearer <jeton client de l'espace personnel>
//                  ou <jeton opérateur du logiciel interne>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { downloadPdf } from '../_shared/google-drive.ts';
import { requireClient, requireOperateur } from '../_shared/crypto.ts';
import { corsHeaders, json, preflight, requireSecret } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  const documentId = new URL(req.url).searchParams.get('documentId')?.trim();
  if (!documentId) return json(400, { error: 'MISSING_DOCUMENT_ID' });

  // Le jeton client est tenté en premier ; à défaut on vérifie le jeton
  // opérateur. Les deux voies mènent au même fichier, avec des règles d'accès
  // différentes : le client ne voit que les siens, l'opérateur voit tout.
  let clientId: string | null = null;
  let operateur = false;

  try {
    const token = await requireClient(req, requireSecret('CLIENT_JWT_SECRET'));
    if (token) clientId = token.sub;
  } catch (err) {
    console.error('Configuration invalide :', err);
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  if (!clientId) {
    operateur = Boolean(await requireOperateur(req, SUPABASE_SERVICE_ROLE_KEY));
    if (!operateur) return json(401, { error: 'UNAUTHENTICATED' });
  }

  const { data: document, error } = await supabase
    .from('documents_acceptation')
    .select('id, client_id, devis_id, devis_numero, devis_version, type_document, drive_file_id, statut')
    .eq('id', documentId)
    .maybeSingle();

  // Un document appartenant à quelqu'un d'autre répond comme un document
  // inexistant : on ne confirme pas son existence au passage.
  if (error || !document || (clientId && document.client_id !== clientId)) {
    return json(404, { error: 'NOT_FOUND' });
  }

  try {
    const bytes = await downloadPdf(document.drive_file_id);
    const prefixe = document.type_document === 'bon_commande' ? 'Bon-de-commande' : 'Devis-signe';
    const nom = `${prefixe}-${document.devis_numero || document.devis_id}-V${document.devis_version}.pdf`;

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nom}"`,
        // Le fichier est immuable, mais il reste privé : le cache partagé d'un
        // proxy n'a rien à faire avec un bon de commande.
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('Lecture Drive échouée pour le document', documentId, err);
    return json(502, { error: 'DOCUMENT_UNAVAILABLE' });
  }
});
