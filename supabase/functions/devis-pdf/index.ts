// Supabase Edge Function — devis-pdf v1
// Sert au client le PDF de son devis, sans jamais exposer l'URL Google Drive.
//
// Le fichier reste privé dans le Drive de la carrière. Cette fonction vérifie
// le jeton du client, vérifie que le devis lui appartient bien et qu'il lui a
// été transmis, puis relaie le contenu. Il n'y a donc aucun lien permanent
// susceptible de circuler et de fuiter des montants.
//
//   GET /functions/v1/devis-pdf?devisId=...
//   Authorization: Bearer <jeton client>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { downloadPdf } from '../_shared/google-drive.ts';
import { requireClient } from '../_shared/crypto.ts';
import { corsHeaders, json, preflight, requireSecret } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// `planifie` manquait : le client ne pouvait plus rouvrir son propre devis une
// fois la livraison programmée. `archive` y figure parce qu'un devis remplacé
// reste consultable — il n'est plus actionnable, ce n'est pas la même chose.
const ETATS_VISIBLES = ['envoye', 'accepte', 'refuse', 'planifie', 'termine', 'archive'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  let jwtSecret: string;
  try {
    jwtSecret = requireSecret('CLIENT_JWT_SECRET');
  } catch (err) {
    console.error('Configuration invalide :', err);
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  const token = await requireClient(req, jwtSecret, supabase);
  if (!token) return json(401, { error: 'UNAUTHENTICATED' });

  const parametres = new URL(req.url).searchParams;
  const devisId = parametres.get('devisId')?.trim();
  const versionDemandee = Number(parametres.get('version') || 0);
  if (!devisId) return json(400, { error: 'MISSING_DEVIS_ID' });

  const { data: devis, error } = await supabase
    .from('devis')
    .select('id, numero_devis, client_id, etat, drive_file_id, document_version')
    .eq('id', devisId)
    .maybeSingle();

  // Même réponse qu'un devis inexistant : on ne confirme pas au passage
  // l'existence d'un devis appartenant à quelqu'un d'autre.
  if (error || !devis || devis.client_id !== token.sub || !ETATS_VISIBLES.includes(devis.etat)) {
    return json(404, { error: 'NOT_FOUND' });
  }

  // Une version antérieure reste consultable : c'est le document sur lequel le
  // client a pu donner son accord, et le seul moyen de comprendre ce qui a
  // changé depuis. Elle est servie depuis son fichier figé, pas depuis le
  // fichier courant.
  let fileId = devis.drive_file_id;
  let version = Number(devis.document_version || 1);

  if (versionDemandee > 0 && versionDemandee !== version) {
    const { data: figee } = await supabase
      .from('devis_versions')
      .select('drive_file_id, version_number')
      .eq('devis_id', devis.id)
      .eq('version_number', versionDemandee)
      .maybeSingle();
    if (!figee) return json(404, { error: 'VERSION_UNAVAILABLE' });
    fileId = figee.drive_file_id;
    version = figee.version_number;
  }

  if (!fileId) return json(404, { error: 'PDF_UNAVAILABLE' });

  try {
    const bytes = await downloadPdf(fileId);
    const nom = `Devis-${devis.numero_devis || devis.id}-V${version}.pdf`;

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nom}"`,
        // Le PDF peut changer à chaque modification du devis : jamais de cache.
        'Cache-Control': 'no-store, private',
      },
    });
  } catch (err) {
    console.error('Lecture Drive échouée pour le devis', devisId, err);
    return json(502, { error: 'PDF_UNAVAILABLE' });
  }
});
