// Supabase Edge Function — send-email v18
// Envoie la notification de demande de devis via SMTP (nodemailer).
// Le destinataire est lu depuis le secret DISPATCH_EMAIL (forcé côté serveur).
// Les credentials SMTP sont lus depuis parametres via service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';
import { requireClient } from '../_shared/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DISPATCH_EMAIL = Deno.env.get('DISPATCH_EMAIL') || 'tvm38@midali.fr';

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

const CAMIONS_LIVRAISON_LABELS: Record<string, string> = {
  auto: 'Laissé au choix de MIDALI',
  A1: '4×2 — 9 t · 3,5 m · 2,50 m',
  A2: '4×2 Grue — 6 t · 3,5 m · 2,50 m',
  A3: '6×4 — 13 t · 3,5 m · 2,55 m',
  A4: '6×6 + Grue — 10 t · 3,5 m · 2,55 m',
  A5: '8×4 — 16 t · 3,5 m · 2,55 m',
  A6: '8×4 + Grue — 12 t · 3,5 m · 2,55 m',
  A7: 'Semi-benne — 28 t · 4,0 m · 2,55 m',
};

const TYPE_DEMANDE_LABELS: Record<string, string> = {
  livraison: '🚛 Livraison avec transport',
  fourniture: '📦 Fourniture uniquement (enlèvement carrière)',
  decharge: '♻️ Mise en décharge',
  livraison_decharge: '📦♻️ Livraison + Décharge (aller-retour)',
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

interface MateriauxItem { code: string; nom: string; tonnes: number; }
interface MateriauxSection { label: string; type?: string; items: MateriauxItem[]; }
interface MateriauxData { sections: MateriauxSection[]; enginChantier?: string; }

function renderMateriauxHtml(raw: string): string {
  let data: MateriauxData;
  try { data = JSON.parse(raw); } catch { return `<div class="mat">${raw || 'Aucun matériau renseigné'}</div>`; }

  const palette: Record<string, { header: string; bg: string }> = {
    livraison: { header: '#0053a1', bg: '#e3f0fb' },
    decharge:  { header: '#6a1b9a', bg: '#f3e5f5' },
    default:   { header: '#0053a1', bg: '#f0f4f8' },
  };
  const emojis: Record<string, string> = { livraison: '📦', decharge: '♻️' };

  let html = '';
  for (const section of data.sections) {
    const c = palette[section.type || 'default'] || palette.default;
    const emoji = emojis[section.type || ''] || '';
    const total = section.items.reduce((s, i) => s + i.tonnes, 0);
    html += `
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${c.header};margin-bottom:8px">${emoji} ${section.label}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:${c.bg}">
            <th style="text-align:left;padding:6px 10px;font-size:10px;color:#666;font-weight:bold;width:50px">Code</th>
            <th style="text-align:left;padding:6px 10px;font-size:10px;color:#666;font-weight:bold">Désignation</th>
            <th style="text-align:right;padding:6px 10px;font-size:10px;color:#666;font-weight:bold;width:60px">Qté</th>
          </tr>
        </thead>
        <tbody>
          ${section.items.map((item, i) => `
          <tr style="border-top:1px solid #eee;background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
            <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:#888">${item.code || '—'}</td>
            <td style="padding:7px 10px;color:#111">${item.nom}</td>
            <td style="padding:7px 10px;text-align:right;font-weight:bold;color:${c.header}">${item.tonnes}t</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid ${c.header};background:${c.bg}">
            <td colspan="2" style="padding:7px 10px;font-weight:bold;font-size:12px;color:${c.header}">Total</td>
            <td style="padding:7px 10px;text-align:right;font-weight:bold;font-size:13px;color:${c.header}">${total}t</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
  }

  if (data.enginChantier) {
    html += `<div style="margin-top:12px;padding:10px 14px;background:#fff8e1;border-left:3px solid #f9a825;border-radius:4px;font-size:12px;color:#444">🔧 <strong>Engin de rechargement prévu :</strong> ${data.enginChantier}</div>`;
  }

  return html || '<em style="color:#999">Aucun matériau renseigné</em>';
}

function calcTotalTonnage(raw: string): number {
  try {
    const data: MateriauxData = JSON.parse(raw);
    return data.sections.reduce((total, section) =>
      total + section.items.reduce((s, i) => s + i.tonnes, 0), 0);
  } catch { return 0; }
}

function buildHtml(fields: {
  prenom: string; nom: string; fonction: string; email: string; telephone: string;
  typeClient: string; dejaClient: string;
  entrepriseNom: string; entrepriseAdresse: string; agenceNom: string;
  typeDemande: string; adresseLivraison: string; camionLivraison: string; dateSouhaitee: string; creneau: string;
  materiauxData: string; notes: string;
}): string {
  const {
    prenom, nom, fonction, email, telephone,
    typeClient, dejaClient,
    entrepriseNom, entrepriseAdresse, agenceNom,
    typeDemande, adresseLivraison, camionLivraison, dateSouhaitee, creneau,
    materiauxData, notes,
  } = fields;

  const isParticulier = typeClient === 'particulier';
  const isPro = !isParticulier;
  const isNouveauClient = dejaClient !== 'oui';
  const hasLivraison = typeDemande === 'livraison' || typeDemande === 'livraison_decharge';

  const typeDemandeLabel = TYPE_DEMANDE_LABELS[typeDemande] || typeDemande;
  const creneauLabel = CRENEAU_LABELS[creneau] || creneau;
  const camionLabel = camionLivraison ? (CAMIONS_LIVRAISON_LABELS[camionLivraison] || camionLivraison) : '';
  const dateLabel = formatDate(dateSouhaitee);
  const entrepriseLabel = entrepriseNom || (isParticulier ? `${prenom} ${nom}` : '');
  const totalTonnage = calcTotalTonnage(materiauxData);

  // Référence et horodatage
  const now = new Date();
  const parisDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const parisTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const receivedAt = `${parisDate} à ${parisTime.replace(':', 'h')}`;

  // Couleurs par type
  const tc = typeDemande === 'decharge'
    ? { accent: '#6a1b9a', bg: '#f9f0ff', border: '#6a1b9a' }
    : { accent: '#0053a1', bg: '#f0f6ff', border: '#0053a1' };

  const typeSubText: Record<string, string> = {
    livraison:          'Livraison directe — client présent pour réceptionner',
    fourniture:         'Le client vient récupérer les matériaux à la carrière avec ses propres véhicules',
    decharge:           'Le client apporte ses matériaux à évacuer directement à la carrière',
    livraison_decharge: 'Le camion livre, repart chargé des déblais — rechargement par le client',
  };

  // Bloc adresse
  const quarryAddr = "489 Rue de l'Isle, 38190 Villard-Bonnot";
  const quarryMaps = "https://maps.google.com/?q=489+Rue+de+l'Isle+38190+Villard-Bonnot";
  let addressHtml = '';
  if (hasLivraison && adresseLivraison) {
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(adresseLivraison)}`;
    addressHtml = `<div style="margin-bottom:12px">
      <div style="font-size:11px;color:#888;margin-bottom:4px">Adresse chantier</div>
      <div style="background:#f5f7fa;border:1px solid #dde3ea;border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:600;color:#111;flex:1">${adresseLivraison}</span>
        <a href="${mapsUrl}" style="font-size:11px;color:#0053a1;text-decoration:none;white-space:nowrap;font-weight:bold" target="_blank">🗺️ Google Maps</a>
      </div></div>`;
  } else if (typeDemande === 'fourniture' || typeDemande === 'decharge') {
    const lieLabel = typeDemande === 'fourniture' ? "Lieu d'enlèvement" : 'Lieu de dépôt';
    addressHtml = `<div style="margin-bottom:12px">
      <div style="font-size:11px;color:#888;margin-bottom:4px">${lieLabel}</div>
      <div style="background:${tc.bg};border:1.5px solid ${tc.accent}40;border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;font-weight:600;color:${tc.accent}">Carrière TVM38</div>
          <div style="font-size:11px;color:#666;margin-top:2px">${quarryAddr}</div>
        </div>
        <a href="${quarryMaps}" style="font-size:11px;color:${tc.accent};text-decoration:none;white-space:nowrap;font-weight:bold" target="_blank">🗺️ Google Maps</a>
      </div></div>`;
  }

  // Bloc camion (livraison uniquement)
  const camionParts = camionLabel.split(' — ');
  const camionHtml = (hasLivraison && camionLabel) ? `<div style="margin-bottom:12px">
    <div style="font-size:11px;color:#888;margin-bottom:4px">Camion souhaité</div>
    <div style="background:#f0f6ff;border:1.5px solid #b3d0f0;border-radius:6px;padding:10px 14px;display:flex;align-items:center;gap:12px">
      <span style="font-size:18px">🚛</span>
      <div>
        <div style="font-size:14px;font-weight:bold;color:#0053a1">${camionParts[0]}</div>
        ${camionParts[1] ? `<div style="font-size:11px;color:#666;margin-top:2px">${camionParts[1]}</div>` : ''}
      </div>
    </div></div>` : '';

  // Bouton Maps dans actions
  const mapsBtn = (hasLivraison && adresseLivraison)
    ? `<a href="https://maps.google.com/?q=${encodeURIComponent(adresseLivraison)}" style="display:inline-block;flex:1;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:bold;text-decoration:none;background:white;color:#333;border:1.5px solid #ccc;text-align:center" target="_blank">📍 Voir le chantier</a>`
    : '';

  // 3e colonne de la bande résumé
  const summaryCol3 = (typeDemande === 'fourniture' || typeDemande === 'decharge')
    ? `<div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:3px;color:white">Lieu</div><div style="font-size:13px;font-weight:bold;color:white">Carrière TVM38</div>`
    : `<div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:3px;color:white">Créneau</div><div style="font-size:13px;font-weight:bold;color:white">${creneauLabel || '—'}</div>`;

  const materiauxHtml = renderMateriauxHtml(materiauxData);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,Helvetica,sans-serif; background:#e8edf2; padding:24px 16px; }
    .wrap { max-width:620px; margin:0 auto; border-radius:10px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.12); }
    .card { background:white; padding:22px 28px; border-bottom:1px solid #eaecf0; }
    .card:last-of-type { border-bottom:none; }
    .slbl { font-size:9.5px; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; color:#0053a1; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #e8f0fb; }
    .row { display:flex; margin-bottom:9px; align-items:baseline; gap:8px; }
    .lbl { font-size:11px; color:#888; width:140px; flex-shrink:0; }
    .val { font-size:13px; color:#111; font-weight:600; flex:1; }
    .val a { color:#0053a1; text-decoration:none; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:bold; margin-right:4px; }
    .b-pro  { background:#e3f0fb; color:#0053a1; }
    .b-part { background:#f3e5f5; color:#6a1b9a; }
    .b-new  { background:#fff0ee; color:#d8002b; border:1px solid #f9bdb7; }
    .b-ok   { background:#e8f5e9; color:#2e7d32; }
    .notes-box { font-size:13px; color:#444; padding:12px 16px; background:#fffde7; border-radius:6px; border-left:3px solid #f9a825; font-style:italic; line-height:1.6; }
  </style>
</head>
<body>
<div class="wrap">

<!-- HEADER -->
<div style="background:#0053a1;color:white">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 28px 14px;border-bottom:1px solid rgba(255,255,255,.15)">
    <img src="https://tvm-38-demande-devis.vercel.app/logo-tvm38.png" alt="TVM38" style="height:34px;display:block">
  </div>
  <div style="padding:14px 28px 18px">
    <div style="font-size:21px;font-weight:bold;margin-bottom:5px">${typeDemandeLabel}</div>
    <div style="font-size:13px;opacity:.75">${entrepriseLabel || `${prenom} ${nom}`} &mdash; reçu le ${receivedAt}</div>
  </div>
  <div style="display:flex;background:#003e7e">
    <div style="flex:1;padding:11px 16px;border-right:1px solid rgba(255,255,255,.1)">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:3px;color:white">Tonnage total</div>
      <div style="font-size:14px;font-weight:bold;color:white">${totalTonnage > 0 ? totalTonnage + ' t' : '—'}</div>
    </div>
    <div style="flex:1;padding:11px 16px;border-right:1px solid rgba(255,255,255,.1)">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:3px;color:white">Date souhaitée</div>
      <div style="font-size:14px;font-weight:bold;color:${dateLabel ? '#ffc107' : 'white'}">${dateLabel || 'Non précisée'}</div>
    </div>
    <div style="flex:1;padding:11px 16px;border-right:1px solid rgba(255,255,255,.1)">
      ${summaryCol3}
    </div>
    <div style="flex:1;padding:11px 16px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:3px;color:white">Statut client</div>
      <div style="font-size:13px;font-weight:bold;color:${isNouveauClient ? '#ff7043' : 'white'}">${isNouveauClient ? 'Accès sans compte' : 'Accès authentifié'}</div>
    </div>
  </div>
</div>

<!-- ACTIONS RAPIDES -->
<div style="background:#f5f7fa;padding:13px 28px;display:flex;gap:10px;border-bottom:1px solid #dde3ea">
  <a href="tel:${telephone.replace(/\s/g,'')}" style="display:inline-block;flex:1;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:bold;text-decoration:none;background:#0053a1;color:white;text-align:center">📞 Appeler</a>
  ${email ? `<a href="mailto:${email}" style="display:inline-block;flex:1;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:bold;text-decoration:none;background:white;color:#0053a1;border:1.5px solid #0053a1;text-align:center">✉️ Répondre</a>` : ''}
  ${mapsBtn}
</div>

<!-- CLIENT & CONTACT -->
<div class="card">
  <div class="slbl">Client &amp; Contact</div>
  <div class="row">
    <span class="lbl">Statut</span>
    <span class="val">
      <span class="badge ${isPro ? 'b-pro' : 'b-part'}">${isPro ? 'Professionnel' : 'Particulier'}</span>
      <span class="badge ${isNouveauClient ? 'b-new' : 'b-ok'}">${isNouveauClient ? 'Accès sans compte' : 'Accès authentifié'}</span>
    </span>
  </div>
  <div class="row"><span class="lbl">Contact</span><span class="val">${prenom} ${nom}${fonction ? ` <span style="font-weight:400;color:#888">(${fonction})</span>` : ''}</span></div>
  <div class="row"><span class="lbl">Téléphone</span><span class="val"><a href="tel:${telephone.replace(/\s/g,'')}">${telephone}</a></span></div>
  ${email ? `<div class="row"><span class="lbl">Email</span><span class="val"><a href="mailto:${email}">${email}</a></span></div>` : ''}
  ${entrepriseNom ? `<div class="row"><span class="lbl">Société</span><span class="val">${entrepriseNom}</span></div>` : ''}
  ${agenceNom ? `<div class="row"><span class="lbl">Agence</span><span class="val">${agenceNom}</span></div>` : ''}
  ${entrepriseAdresse ? `<div class="row"><span class="lbl">Adresse siège</span><span class="val" style="font-weight:400;color:#555">${entrepriseAdresse}</span></div>` : ''}
</div>

<!-- INTERVENTION -->
<div class="card">
  <div class="slbl">Intervention</div>
  <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:${tc.bg};border-left:4px solid ${tc.border};border-radius:0 6px 6px 0;margin-bottom:16px">
    <div>
      <div style="font-size:14px;font-weight:bold;color:${tc.accent}">${typeDemandeLabel}</div>
      <div style="font-size:11px;color:#555;margin-top:2px">${typeSubText[typeDemande] || ''}</div>
    </div>
  </div>
  ${addressHtml}
  ${camionHtml}
  ${dateLabel ? `<div class="row"><span class="lbl">Date souhaitée</span><span class="val" style="color:#d8002b">${dateLabel}</span></div>` : ''}
  ${(creneauLabel && typeDemande !== 'fourniture') ? `<div class="row"><span class="lbl">Créneau</span><span class="val">${creneauLabel}</span></div>` : ''}
</div>

<!-- MATÉRIAUX -->
<div class="card">
  <div class="slbl">Matériaux</div>
  ${materiauxHtml}
</div>

${notes ? `
<!-- NOTES -->
<div class="card">
  <div class="slbl">Notes client</div>
  <div class="notes-box">${notes.replace(/\n/g, '<br>')}</div>
</div>` : ''}

<!-- FOOTER -->
<div style="background:#f5f7fa;padding:14px 28px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #dde3ea">
  <div style="font-size:11px;color:#aaa;line-height:1.6">TVM38 &mdash; Carrière de matériaux<br>489 Rue de l'Isle, 38190 Villard-Bonnot</div>
  <div style="font-size:11px;color:#888;text-align:right">Reçu le ${receivedAt}</div>
</div>

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
      camionLivraison: safe(body.camionLivraison, 10),
      dateSouhaitee: safe(body.dateSouhaitee),
      creneau: safe(body.creneau),
      materiauxData: String(body.materiauxData || '').slice(0, 5000),
      notes: String(body.notes || '').slice(0, 1000),
    };

    // -----------------------------------------------------------------------
    // Persistance de la demande
    // -----------------------------------------------------------------------
    // Jusqu'ici une demande n'existait que sous forme d'email. Elle est
    // désormais enregistrée pour alimenter l'espace client et permettre au
    // dispatcher de la convertir en devis.
    //
    // Le client est identifié par son jeton signé, jamais par un identifiant
    // fourni dans le corps de la requête : personne ne peut rattacher une
    // demande au compte d'un autre. En mode invité, il n'y a pas de jeton et la
    // demande est enregistrée sans rattachement.
    //
    // Un échec ici ne doit JAMAIS empêcher l'email de partir : l'email reste le
    // filet de sécurité de la carrière.
    let clientId: string | null = null;
    try {
      const secret = Deno.env.get('CLIENT_JWT_SECRET');
      if (secret && secret.length >= 32) {
        const token = await requireClient(req, secret, supabase);
        clientId = token?.sub ?? null;
      }
    } catch (err) {
      console.error('Vérification du jeton client échouée :', err);
    }

    try {
      const { error: demandeError } = await supabase.from('demandes').insert({
        client_id: clientId,
        type_client: fields.typeClient || 'professionnel',
        deja_client: fields.dejaClient || null,
        entreprise_nom: fields.entrepriseNom || null,
        entreprise_adresse: fields.entrepriseAdresse || null,
        agence_nom: fields.agenceNom || null,
        contact_nom: fields.nom || null,
        contact_prenom: fields.prenom || null,
        contact_fonction: fields.fonction || null,
        contact_telephone: fields.telephone || null,
        contact_email: fields.email || null,
        type_demande: fields.typeDemande || 'livraison',
        adresse_livraison: fields.adresseLivraison || null,
        camion_livraison: fields.camionLivraison || null,
        engin_chantier: safe(body.enginChantier, 100) || null,
        date_souhaitee: fields.dateSouhaitee || null,
        creneau: fields.creneau || null,
        lignes: Array.isArray(body.lignes) ? body.lignes : [],
        notes: fields.notes || null,
        statut: 'envoyee',
        source: 'web',
      });

      if (demandeError) {
        console.error("Enregistrement de la demande échoué (l'email part quand même) :", demandeError);
      }
    } catch (err) {
      console.error("Enregistrement de la demande échoué (l'email part quand même) :", err);
    }

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
