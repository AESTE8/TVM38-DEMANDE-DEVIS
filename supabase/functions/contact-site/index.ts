// Supabase Edge Function — contact-site v1
// Remplace les appels directs du navigateur vers api.web3forms.com.
//
// Trois messages du site passent ici : récupération d'identifiants, demande
// d'ouverture de compte et avis client. Même principe que send-email : les
// credentials SMTP sont lus en base via service_role et le destinataire est
// forcé côté serveur. Le navigateur ne transporte donc plus aucune clé, et
// aucune donnée personnelle ne sort vers un tiers.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

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

function safe(val: unknown, max = 300): string {
  return String(val || '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
}

/** Texte multiligne : on garde les retours, on borne la taille. */
function safeText(val: unknown, max = 2000): string {
  return String(val || '').replace(/\r/g, '').trim().slice(0, max);
}

function escapeHtml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Garde-fou anti-abus. L'isolate Deno n'est pas partagé entre régions ni
// garanti persistant : c'est une limite de confort, pas une protection forte.
// Une limitation durable passerait par une table dédiée.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_MAX;
}

type MessageType = 'identifiants' | 'ouverture_compte' | 'avis';

const SUJETS: Record<MessageType, (f: Champs) => string> = {
  identifiants: (f) => `Récupération identifiants TVM38 : ${f.codeClient || 'code non renseigné'}`,
  ouverture_compte: () => "Demande d'ouverture de compte TVM38",
  avis: (f) => `Avis client TVM38${f.note ? ` — ${f.note}` : ''}`,
};

interface Champs {
  nom: string;
  email: string;
  telephone: string;
  entreprise: string;
  codeClient: string;
  note: string;
  message: string;
}

function ligne(label: string, valeur: string): string {
  if (!valeur) return '';
  return `<tr><td style="padding:6px 12px;color:#5b6b7c;font-size:13px;white-space:nowrap">${escapeHtml(label)}</td>`
    + `<td style="padding:6px 12px;color:#0b1b2b;font-size:14px;font-weight:600">${escapeHtml(valeur)}</td></tr>`;
}

function buildHtml(type: MessageType, f: Champs): string {
  const titres: Record<MessageType, string> = {
    identifiants: "Récupération d'identifiants",
    ouverture_compte: "Demande d'ouverture de compte",
    avis: 'Avis client',
  };

  const corps = [
    ligne('Nom', f.nom),
    ligne('Entreprise', f.entreprise),
    ligne('Code client', f.codeClient),
    ligne('Email', f.email),
    ligne('Téléphone', f.telephone),
    ligne('Note', f.note),
  ].join('');

  const messageHtml = f.message
    ? `<div style="margin-top:16px;padding:14px 16px;background:#f0f4f8;border-radius:10px;color:#0b1b2b;font-size:14px;white-space:pre-wrap">${escapeHtml(f.message)}</div>`
    : '';

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#eef2f6;padding:24px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
    <div style="background:#0053a1;color:#fff;padding:18px 24px;font-size:17px;font-weight:700">MIDALI - TVM38 — ${escapeHtml(titres[type])}</div>
    <div style="padding:20px 12px">
      <table style="width:100%;border-collapse:collapse">${corps}</table>
      ${messageHtml}
    </div>
    <div style="padding:14px 24px;color:#5b6b7c;font-size:12px;border-top:1px solid #e3eaf1">Message émis depuis le site de demande de devis TVM38.</div>
  </div>
</body></html>`;
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

    // Piège à robots : le champ est masqué côté navigateur, un humain ne le
    // remplit jamais. On répond 200 pour ne rien apprendre au spammeur.
    if (safe(body.hp, 50)) return json(200, { success: true });

    const type = safe(body.type, 40) as MessageType;
    if (!SUJETS[type]) return json(400, { error: 'Type de message inconnu' });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'inconnu';
    if (rateLimited(ip)) {
      return json(429, { error: 'Trop de demandes envoyées. Réessayez dans quelques minutes.' });
    }

    const champs: Champs = {
      nom: safe(body.nom, 120),
      email: safe(body.email, 200),
      telephone: safe(body.telephone, 40),
      entreprise: safe(body.entreprise, 200),
      codeClient: safe(body.codeClient, 60),
      note: safe(body.note, 20),
      message: safeText(body.message, 2000),
    };

    if (type !== 'avis' && !champs.nom && !champs.email && !champs.telephone) {
      return json(400, { error: 'Message vide' });
    }

    const { data: params, error: paramsError } = await supabase
      .from('parametres')
      .select('smtp_host,smtp_port,smtp_user,smtp_password,smtp_nom_affiche')
      .eq('id', 1)
      .maybeSingle();

    if (paramsError || !params?.smtp_host || !params?.smtp_user || !params?.smtp_password) {
      return json(500, { error: 'Configuration SMTP non configurée sur le serveur' });
    }

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
      replyTo: champs.email || undefined,
      subject: SUJETS[type](champs).replace(/[\r\n]/g, ' ').slice(0, 500),
      html: buildHtml(type, champs),
    });

    return json(200, { success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json(500, { error: message });
  }
});
