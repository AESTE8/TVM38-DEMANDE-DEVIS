import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { MATERIAUX } from '../../src/data/materiaux';

const resend = new Resend(process.env.RESEND_API_KEY);
const STAFF_EMAIL = process.env.TVM38_STAFF_EMAIL!;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL!;

function formatDate(iso?: string): string {
  if (!iso) return 'Non précisée';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function creneauLabel(c?: string): string {
  if (c === 'matin') return 'Matin';
  if (c === 'apres_midi') return 'Après-midi';
  return 'Indifférent';
}

function buildStaffHtml(data: any): string {
  const lignesActives = data.lignes.filter((l: any) => l.quantiteTonnes > 0);
  const totalTonnes = lignesActives.reduce((s: number, l: any) => s + l.quantiteTonnes, 0);

  const rows = lignesActives.map((l: any) => {
    const mat = MATERIAUX.find(m => m.id === l.materiauId);
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${mat?.nom ?? l.materiauId}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${l.quantiteTonnes} t</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#718096;">${l.quantiteM3} m³</td>
    </tr>`;
  }).join('');

  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const identity = data.typeClient === 'professionnel' 
    ? `${data.entrepriseNom} (Contact: ${data.prenom} ${data.nom})`
    : `${data.prenom} ${data.nom}`;

  return `<!DOCTYPE html><html lang="fr"><body style="font-family:Inter,Arial,sans-serif;color:#1a202c;background:#f7fafc;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#a43700;padding:24px 32px;">
    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:700;">Nouvelle demande de devis</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:12px;">Reçue le ${now}</p>
  </td></tr>
  <tr><td style="padding:24px 32px 0;">
    <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#718096;margin:0 0 10px;">Informations client</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
      <tr><td style="padding:3px 0;color:#718096;width:42%;">Client</td><td style="padding:3px 0;font-weight:600;">${identity}</td></tr>
      <tr><td style="padding:3px 0;color:#718096;">Type</td><td style="padding:3px 0;font-weight:600;">${data.typeClient === 'professionnel' ? 'Professionnel' : 'Particulier'}</td></tr>
      <tr><td style="padding:3px 0;color:#718096;">Déjà client ?</td><td style="padding:3px 0;font-weight:600;">${data.dejaClient === 'oui' ? 'Oui' : 'Non'}</td></tr>
      ${data.entrepriseAdresse ? `<tr><td style="padding:3px 0;color:#718096;">Adresse siège</td><td style="padding:3px 0;font-weight:600;">${data.entrepriseAdresse}</td></tr>` : ''}
      <tr><td style="padding:3px 0;color:#718096;">Téléphone</td><td style="padding:3px 0;font-weight:600;">${data.telephone}</td></tr>
      <tr><td style="padding:3px 0;color:#718096;">Email</td><td style="padding:3px 0;font-weight:600;">${data.email}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#718096;margin:0 0 10px;">Projet</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
      <tr><td style="padding:3px 0;color:#718096;width:42%;">Type de demande</td><td style="padding:3px 0;font-weight:600;">${data.typeDemande === 'livraison' ? 'Livraison avec transport' : 'Fourniture uniquement'}</td></tr>
      ${data.typeDemande === 'livraison' ? `
      <tr><td style="padding:3px 0;color:#718096;">Adresse chantier</td><td style="padding:3px 0;font-weight:600;">${data.adresseLivraison ?? ''}</td></tr>
      <tr><td style="padding:3px 0;color:#718096;">Date souhaitée</td><td style="padding:3px 0;font-weight:600;">${formatDate(data.dateSouhaitee)}</td></tr>
      <tr><td style="padding:3px 0;color:#718096;">Créneau préféré</td><td style="padding:3px 0;font-weight:600;">${creneauLabel(data.creneau)}</td></tr>
      ` : ''}
    </table>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#718096;margin:0 0 10px;">Matériaux</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <tr style="background:#f7fafc;">
        <th style="padding:7px 12px;text-align:left;font-size:11px;color:#718096;font-weight:600;">Matériau</th>
        <th style="padding:7px 12px;text-align:right;font-size:11px;color:#718096;font-weight:600;">Tonnes</th>
        <th style="padding:7px 12px;text-align:right;font-size:11px;color:#718096;font-weight:600;">m³</th>
      </tr>
      ${rows}
      <tr style="background:#fff7ed;">
        <td style="padding:8px 12px;font-weight:700;font-size:13px;">Total estimé</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;color:#a43700;">${Math.round(totalTonnes * 10) / 10} t</td>
        <td></td>
      </tr>
    </table>
  </td></tr>
  ${data.notes ? `<tr><td style="padding:20px 32px 0;">
    <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#718096;margin:0 0 10px;">Détails complémentaires</h2>
    <p style="background:#f7fafc;border-radius:8px;padding:12px 16px;margin:0;font-size:13px;white-space:pre-wrap;">${data.notes}</p>
  </td></tr>` : ''}
  <tr><td style="padding:24px 32px;"></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildCustomerHtml(data: any): string {
  const lignesActives = data.lignes.filter((l: any) => l.quantiteTonnes > 0);
  const matList = lignesActives.map((l: any) => {
    const mat = MATERIAUX.find(m => m.id === l.materiauId);
    return `<li style="margin-bottom:4px;">${mat?.nom ?? l.materiauId} — ${l.quantiteTonnes} t</li>`;
  }).join('');

  const prenom = data.prenom || '';

  return `<!DOCTYPE html><html lang="fr"><body style="font-family:Inter,Arial,sans-serif;color:#1a202c;background:#f7fafc;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#a43700;padding:24px 32px;">
    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:700;">Confirmation de votre demande — MIDALI - TVM38</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="font-size:14px;">Bonjour ${prenom},</p>
    <p style="font-size:14px;">Nous avons bien reçu votre demande de devis via notre site web. Notre équipe accorde un <strong>traitement prioritaire</strong> à votre demande pour ne pas ralentir vos travaux.</p>
    <div style="background:#fff7ed;border-left:4px solid #a43700;padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#a43700;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Récapitulatif de votre demande</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;">${matList}</ul>
      ${data.typeDemande === 'livraison' && data.adresseLivraison ? `<p style="margin:8px 0 0;font-size:13px;">Livraison prévue à : <strong>${data.adresseLivraison}</strong></p>` : ''}
    </div>
    <p style="font-size:13px;color:#718096;">Pour toute question complémentaire :</p>
    <ul style="font-size:13px; color: #1a202c;">
      <li>Téléphone : <strong>04 76 71 42 11</strong></li>
      <li>Email : <strong>tvm38@midali.fr</strong></li>
    </ul>
    <p style="font-size:13px;margin-top:32px;">Cordialement,<br><strong>L'équipe MIDALI - TVM38</strong><br><span style="color:#718096;font-size:11px;">Villard-Bonnot, Isère</span></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let data: any;
  try {
    data = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Validation minimale
  if (!data.email || !data.telephone || !data.nom || !data.prenom) {
    return { statusCode: 400, body: 'Champs requis manquants' };
  }

  try {
    const resStaff = await resend.emails.send({
      from: `MIDALI - TVM38 <${FROM_EMAIL}>`,
      to: [STAFF_EMAIL],
      replyTo: data.email,
      subject: `[DEVIS SITE] ${data.typeClient.toUpperCase()} - ${data.entrepriseNom || data.nom}`,
      html: buildStaffHtml(data),
    });

    const resCustomer = await resend.emails.send({
      from: `MIDALI - TVM38 <${FROM_EMAIL}>`,
      to: [data.email],
      subject: 'Confirmation de votre demande de devis — MIDALI - TVM38',
      html: buildCustomerHtml(data),
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, resStaff, resCustomer }),
    };
  } catch (err) {
    console.error('Resend error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur lors de l'envoi des emails" }) };
  }
};
