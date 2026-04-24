// Supabase Edge Function — send-email v18
// Envoie la notification de demande de devis via SMTP (nodemailer).
// Le destinataire est lu depuis le secret DISPATCH_EMAIL (forcé côté serveur).
// Les credentials SMTP sont lus depuis parametres via service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DISPATCH_EMAIL = Deno.env.get('DISPATCH_EMAIL') || 'e.aubree-carceles@midali.fr';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

const CRENEAU_LABELS: Record<string, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  indifferent: 'Indifférent',
};

const TYPE_DEMANDE_LABELS: Record<string, string> = {
  livraison: '🚛 Livraison avec transport',
  fourniture: '📦 Fourniture uniquement (enlèvement carrière)',
  decharge: '♻️ Mise en décharge',
};

function safe(val: unknown, max = 300): string {
  return String(val || '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildHtml(fields: {
  prenom: string; nom: string; fonction: string; email: string; telephone: string;
  typeClient: string; dejaClient: string;
  entrepriseNom: string; entrepriseAdresse: string; agenceNom: string;
  typeDemande: string; adresseLivraison: string; dateSouhaitee: string; creneau: string;
  materiaux: string; notes: string;
}): string {
  const {
    prenom, nom, fonction, email, telephone,
    typeClient, dejaClient,
    entrepriseNom, entrepriseAdresse, agenceNom,
    typeDemande, adresseLivraison, dateSouhaitee, creneau,
    materiaux, notes,
  } = fields;

  const isParticulier = typeClient === 'particulier';
  const isPro = !isParticulier;
  const isNouveauClient = dejaClient !== 'oui';
  const typeDemandeLabel = TYPE_DEMANDE_LABELS[typeDemande] || typeDemande;
  const creneauLabel = CRENEAU_LABELS[creneau] || creneau;
  const dateLabel = formatDate(dateSouhaitee);
  const entrepriseLabel = entrepriseNom || (isParticulier ? `${prenom} ${nom}` : '');

  let adresseInterv = adresseLivraison;
  if (typeDemande === 'decharge') adresseInterv = "Carrière TVM38 — 489 Rue de l'Isle, 38190 Villard-Bonnot";
  if (typeDemande === 'fourniture') adresseInterv = '';

  const materiauxLines = (materiaux || '').split('\n').filter(Boolean).map(l =>
    `- ${l.replace(/^-\s*/, '')}`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 24px; }
    .wrap { max-width: 580px; margin: 0 auto; }
    .header { background: #0f2940; color: white; padding: 28px 32px; border-radius: 8px 8px 0 0; }
    .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .header p { font-size: 13px; opacity: 0.7; }
    .card { background: white; padding: 24px 32px; border-bottom: 1px solid #eee; }
    .card:last-of-type { border-bottom: none; border-radius: 0 0 8px 8px; }
    .section-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.2px; color: #999; margin-bottom: 14px; }
    .row { display: flex; margin-bottom: 10px; align-items: baseline; }
    .lbl { font-size: 12px; color: #888; width: 130px; flex-shrink: 0; }
    .val { font-size: 13px; color: #111; font-weight: 500; }
    .badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-right: 4px; }
    .b-pro { background: #e3f0fb; color: #1565c0; }
    .b-part { background: #f3e5f5; color: #6a1b9a; }
    .b-new { background: #fff3e0; color: #e65100; }
    .b-existing { background: #e8f5e9; color: #2e7d32; }
    .demande-box { font-size: 15px; font-weight: bold; color: #0f2940; padding: 14px 18px; background: #f0f4f8; border-radius: 6px; margin-bottom: 14px; }
    .mat { font-family: 'Courier New', monospace; font-size: 12px; background: #f7f7f7; padding: 12px 16px; border-radius: 6px; white-space: pre-line; line-height: 1.8; }
    .notes-box { font-size: 13px; color: #444; padding: 12px 16px; background: #fffde7; border-radius: 6px; border-left: 3px solid #f9a825; font-style: italic; }
    .footer { text-align: center; font-size: 11px; color: #aaa; padding: 16px; }
  </style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <h1>Nouvelle demande de devis</h1>
    <p>${entrepriseLabel || `${prenom} ${nom}`}${dateLabel ? ` &mdash; ${dateLabel}` : ''}</p>
  </div>

  <div class="card">
    <div class="section-label">Contact</div>
    <div class="row"><span class="lbl">Nom</span><span class="val">${prenom} ${nom}${fonction ? ` <span style="font-weight:400;color:#888">(${fonction})</span>` : ''}</span></div>
    <div class="row"><span class="lbl">Email</span><span class="val">${email}</span></div>
    <div class="row"><span class="lbl">Téléphone</span><span class="val">${telephone}</span></div>
    <div class="row"><span class="lbl">Statut</span><span class="val">
      <span class="badge ${isPro ? 'b-pro' : 'b-part'}">${isPro ? 'Professionnel' : 'Particulier'}</span>
      <span class="badge ${isNouveauClient ? 'b-new' : 'b-existing'}">${isNouveauClient ? 'Nouveau client' : 'Client existant'}</span>
    </span></div>
  </div>

  ${isPro || entrepriseNom ? `
  <div class="card">
    <div class="section-label">Entreprise</div>
    ${entrepriseNom ? `<div class="row"><span class="lbl">Société</span><span class="val">${entrepriseNom}</span></div>` : ''}
    ${entrepriseAdresse ? `<div class="row"><span class="lbl">Adresse siège</span><span class="val">${entrepriseAdresse}</span></div>` : ''}
    ${agenceNom ? `<div class="row"><span class="lbl">Agence</span><span class="val">${agenceNom}</span></div>` : ''}
  </div>` : ''}

  <div class="card">
    <div class="section-label">Demande</div>
    <div class="demande-box">${typeDemandeLabel}</div>
    ${adresseInterv ? `<div class="row"><span class="lbl">Adresse chantier</span><span class="val">${adresseInterv}</span></div>` : ''}
    ${dateLabel ? `<div class="row"><span class="lbl">Date souhaitée</span><span class="val">${dateLabel}</span></div>` : ''}
    ${creneauLabel ? `<div class="row"><span class="lbl">Créneau</span><span class="val">${creneauLabel}</span></div>` : ''}
  </div>

  <div class="card">
    <div class="section-label">Matériaux</div>
    <div class="mat">${materiauxLines || 'Aucun matériau renseigné'}</div>
  </div>

  ${notes ? `
  <div class="card">
    <div class="section-label">Notes client</div>
    <div class="notes-box">${notes.replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <div class="footer">TVM38 &mdash; Carrière de matériaux &mdash; 489 Rue de l'Isle, 38190 Villard-Bonnot</div>

</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'JSON invalide' });
    }

    // Lire les credentials SMTP depuis la DB via service_role — jamais fournis par le client
    const { data: params, error: paramsError } = await supabase
      .from('parametres')
      .select('smtp_host,smtp_port,smtp_user,smtp_password,smtp_nom_affiche')
      .eq('id', 1)
      .maybeSingle();

    if (paramsError || !params?.smtp_host || !params?.smtp_user || !params?.smtp_password) {
      return json(500, { error: 'Configuration SMTP non configurée sur le serveur' });
    }

    const fields = {
      prenom: safe(body.prenom, 100),
      nom: safe(body.nom, 100),
      fonction: safe(body.fonction, 100),
      email: safe(body.email, 200),
      telephone: safe(body.telephone, 50),
      typeClient: safe(body.typeClient),
      dejaClient: safe(body.dejaClient),
      entrepriseNom: safe(body.entrepriseNom, 200),
      entrepriseAdresse: safe(body.entrepriseAdresse, 300),
      agenceNom: safe(body.agenceNom, 200),
      typeDemande: safe(body.typeDemande),
      adresseLivraison: safe(body.adresseLivraison, 300),
      dateSouhaitee: safe(body.dateSouhaitee),
      creneau: safe(body.creneau),
      materiaux: String(body.materiaux || '').slice(0, 2000),
      notes: String(body.notes || '').slice(0, 1000),
    };

    const subject = `Demande de devis — ${fields.prenom} ${fields.nom}${fields.entrepriseNom ? ' (' + fields.entrepriseNom + ')' : ''}`;
    const html = buildHtml(fields);

    const safeName = (params.smtp_nom_affiche || 'TVM38').replace(/[\r\n\t"<>]/g, '').slice(0, 100);

    const transporter = nodemailer.createTransport({
      host: params.smtp_host,
      port: params.smtp_port || 587,
      secure: params.smtp_port === 465,
      auth: { user: params.smtp_user, pass: params.smtp_password },
    });

    await transporter.sendMail({
      from: `"${safeName}" <${params.smtp_user}>`,
      to: DISPATCH_EMAIL,
      replyTo: fields.email || undefined,
      subject: subject.replace(/[\r\n]/g, ' ').slice(0, 500),
      html,
    });

    return json(200, { success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json(500, { error: message });
  }
});
