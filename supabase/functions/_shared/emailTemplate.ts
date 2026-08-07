/**
 * Gabarit unique des e-mails TVM38 vers les clients.
 *
 * Six e-mails partent vers les clients : devis envoyé, document reçu,
 * acceptation validée, régularisation demandée, document rejeté, identifiants.
 * Écrits séparément ils divergeraient en quelques mois — c'est exactement ce
 * qui est arrivé au calcul du transport. Chacun ne fournit ici que son titre,
 * son message et son bouton ; l'en-tête, le bloc identifiants, le QR code et
 * le pied de page sont communs.
 */

export const SITE_URL = 'https://tvm-38-demande-devis.vercel.app';

export interface IdentifiantsClient {
  identifiant: string;
  motDePasse: string;
}

export interface GabaritEmail {
  /** Titre affiché dans le bandeau bleu. */
  titre: string;
  /** Ligne secondaire du bandeau (numéro de devis, montant…). */
  sousTitre?: string;
  /** Corps HTML déjà échappé. */
  corps: string;
  /** Encadré mis en avant, optionnel. */
  encadre?: { intitule: string; valeur: string };
  /** Bouton principal. */
  bouton?: { libelle: string; url: string };
  /** Lien discret sous le bouton. */
  lienSecondaire?: { libelle: string; url: string };
  /** QR code en data: URI, affiché à côté du bouton. */
  qrCodeDataUri?: string;
  identifiants?: IdentifiantsClient;
  /** Rappel des possibilités de l'espace client. */
  rappelEspace?: boolean;
}

export function echapper(valeur: unknown): string {
  return String(valeur ?? '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere] ?? caractere);
}

function blocIdentifiants(ids: IdentifiantsClient): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0;border:1px solid #dde3ea;border-radius:10px;background:#f8fafc">
    <tr><td style="padding:16px 18px">
      <div style="margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">Vos identifiants de connexion</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="width:105px;padding:3px 0;font-size:12px;color:#6b7280">Identifiant</td>
          <td style="padding:3px 0;font-size:14px;font-weight:700;color:#172033">${echapper(ids.identifiant)}</td>
        </tr>
        <tr>
          <td style="width:105px;padding:3px 0;font-size:12px;color:#6b7280">Mot de passe</td>
          <td style="padding:3px 0;font-size:14px;font-weight:700;color:#172033">${echapper(ids.motDePasse)}</td>
        </tr>
      </table>
    </td></tr>
  </table>`;
}

function blocEspace(): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-top:1px solid #eceff3">
    <tr><td style="padding:18px 0 0">
      <div style="margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">Votre espace client TVM38</div>
      <div style="font-size:14px;line-height:1.9;color:#172033">
        &bull;&nbsp; Demander un devis<br>
        &bull;&nbsp; <strong>Valider votre devis en ligne</strong><br>
        <span style="padding-left:16px;font-size:12px;color:#6b7280">en nous retournant le devis signé ou votre bon de commande — TVM38 le vérifie puis confirme votre commande</span><br>
        &bull;&nbsp; Suivre l'avancement de vos dossiers
      </div>
    </td></tr>
  </table>`;
}

function blocAction(gabarit: GabaritEmail): string {
  if (!gabarit.bouton) return '';

  const bouton = `<a href="${echapper(gabarit.bouton.url)}" style="display:inline-block;background-color:#0053a1;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:14px 30px;border-radius:8px;letter-spacing:1px;text-transform:uppercase">${echapper(gabarit.bouton.libelle)}</a>`;

  const secondaire = gabarit.lienSecondaire
    ? `<div style="margin-top:12px;font-size:12px"><a href="${echapper(gabarit.lienSecondaire.url)}" style="color:#56708f;text-decoration:underline">${echapper(gabarit.lienSecondaire.libelle)}</a></div>`
    : '';

  // Le QR porte le même lien que le bouton : il sert au conducteur de travaux
  // qui lit l'e-mail au bureau et veut répondre depuis le chantier.
  const qr = gabarit.qrCodeDataUri
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0"><tr>
         <td style="padding-right:12px"><img src="${gabarit.qrCodeDataUri}" alt="" width="96" height="96" style="display:block;border:1px solid #dde3ea;border-radius:8px"></td>
         <td style="font-size:12px;line-height:1.6;color:#6b7280;text-align:left">Scannez pour ouvrir<br>ce dossier sur votre<br>téléphone</td>
       </tr></table>`
    : '';

  return `<div style="margin:26px 0 0;text-align:center">${bouton}${secondaire}${qr}</div>`;
}

export function construireEmail(gabarit: GabaritEmail): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#e8edf2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;width:100%;border-radius:12px;background:#ffffff;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)">
      <tr><td style="background:#0053a1;color:#ffffff;padding:20px 28px">
        <img src="${SITE_URL}/logo-tvm38.png" alt="TVM38" style="display:block;height:36px;margin-bottom:18px">
        <div style="font-size:22px;font-weight:700">${echapper(gabarit.titre)}</div>
        ${gabarit.sousTitre ? `<div style="margin-top:5px;font-size:13px;opacity:.78">${echapper(gabarit.sousTitre)}</div>` : ''}
      </td></tr>
      <tr><td style="padding:28px;font-size:15px;line-height:1.65">
        ${gabarit.corps}
        ${gabarit.encadre ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:22px 0;border:1px solid #b8cee7;border-radius:10px;background:#f0f6ff">
          <tr><td style="padding:18px">
            <div style="margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">${echapper(gabarit.encadre.intitule)}</div>
            <div style="font-size:17px;font-weight:700;color:#0053a1">${echapper(gabarit.encadre.valeur)}</div>
          </td></tr>
        </table>` : ''}
        ${blocAction(gabarit)}
        ${gabarit.identifiants ? blocIdentifiants(gabarit.identifiants) : ''}
        ${gabarit.rappelEspace ? blocEspace() : ''}
      </td></tr>
      <tr><td style="border-top:1px solid #dde3ea;background:#f5f7fa;padding:16px 28px;font-size:11px;line-height:1.6;color:#8792a2">
        TVM38 — Carrière de matériaux<br>489 Rue de l'Isle, 38190 Villard-Bonnot
      </td></tr>
    </table>
  </body></html>`;
}
