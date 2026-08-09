/**
 * Gabarit unique des e-mails TVM38 vers les clients.
 *
 * ORIGINAL. Le logiciel en garde une copie dans
 * `TVM38-Devis-Logistique/supabase/functions/_shared/emailTemplate.ts`, et son
 * test `emailTemplate.test.ts` compare les deux : toute modification faite ici
 * doit être reportée là-bas, et réciproquement.
 *
 * Neuf e-mails partent vers les clients : devis envoyé, identifiants,
 * ouverture de compte, document reçu, acceptation validée, régularisation
 * demandée, document rejeté, réponse à un message, livraison terminée. Écrits
 * séparément ils divergeraient en quelques mois — c'est exactement ce qui est
 * arrivé au calcul du transport. Chacun ne fournit ici que son titre, son
 * message et son bouton ; l'en-tête, le QR code, le bloc de contact et le pied
 * de page sont communs.
 *
 * Le logiciel consomme ce module directement (il ne contient aucune API Deno).
 * Il produit aussi la version texte brut : un e-mail uniquement HTML pèse dans
 * le score anti-spam, et les clients TVM38 sont majoritairement sur des filtres
 * Microsoft 365.
 */

export const SITE_URL = 'https://tvm-38-demande-devis.vercel.app';

/**
 * Interlocuteur affiché en bas de chaque e-mail.
 *
 * Une carrière n'écrit pas à ses clients depuis une adresse anonyme : le nom du
 * responsable est ce qui rend le message crédible et évite l'appel « c'est bien
 * vous qui m'avez écrit ? ». L'entité juridique reste mentionnée dans le pied
 * de page — un e-mail à en-tête TVM38 signé « Midali Frères, Goncelin » avec un
 * lien vers un troisième domaine avait le profil exact d'un hameçonnage.
 */
export const CONTACT_TVM38 = {
  nom: 'Maxime ROMANET',
  fonction: 'Responsable Carrière TVM38',
  email: 'tvm38@midali.fr',
  telephone: '06 20 72 19 60',
} as const;

export interface IdentifiantsClient {
  identifiant: string;
  /**
   * Omis partout sauf sur les deux e-mails d'accès (identifiants, ouverture de
   * compte). Un mot de passe répété dans chaque notification finit dans tous
   * les transferts du client — et n'a plus rien d'un compte à s'approprier.
   */
  motDePasse?: string;
}

export interface LienEmail {
  libelle: string;
  url: string;
}

export interface GabaritEmail {
  /** Titre affiché dans le bandeau bleu. */
  titre: string;
  /** Ligne secondaire du bandeau (numéro de devis, montant…). */
  sousTitre?: string;
  /** Corps HTML déjà échappé. */
  corps: string;
  /** Équivalent texte brut du corps. Déduit du HTML s'il est absent. */
  corpsTexte?: string;
  /** Encadré mis en avant, optionnel. */
  encadre?: { intitule: string; valeur: string };
  /** Bouton principal. */
  bouton?: { libelle: string; url: string };
  /**
   * Lien(s) discret(s) sous le bouton.
   *
   * Accepte une liste : un e-mail porte au minimum « tous mes dossiers » et
   * « faire une nouvelle demande ». La forme unitaire reste acceptée pour que
   * la copie du site continue de compiler sans être réécrite.
   */
  lienSecondaire?: LienEmail | LienEmail[];
  /** Identifiant de la pièce jointe portant le QR code, affiché près du bouton. */
  qrCodeCid?: string;
  /** Texte affiché à côté du QR. Par défaut : ouverture du dossier sur mobile. */
  qrLegende?: string;
  identifiants?: IdentifiantsClient;
  /** Rappel des possibilités de l'espace client. */
  rappelEspace?: boolean;
  /**
   * Logo en pièce jointe (`cid:`) plutôt qu'en image distante. Outlook bloque
   * les images externes tant que le destinataire ne les autorise pas : sans
   * CID, le premier contact avec la marque est un cadre vide.
   */
  logoCid?: string;
  /**
   * Bloc HTML propre à un seul e-mail, inséré juste avant le contact.
   *
   * Sert à ce qui n'a de sens que sur un message donné — la demande d'avis, par
   * exemple, qui ne doit exister qu'après une livraison faite. La loger ici
   * plutôt que dans le gabarit évite qu'elle redevienne disponible partout :
   * c'est comme ça qu'elle avait fini sur un devis pas encore signé.
   */
  complement?: string;
  /** Équivalent texte brut de `complement`. */
  complementTexte?: string;
}

export function echapper(valeur: unknown): string {
  return String(valeur ?? '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere] ?? caractere);
}

/** Repasse une entité HTML en caractère, pour la version texte. */
function desechapper(valeur: string): string {
  return valeur
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Version lisible d'un fragment HTML, pour la partie `text/plain`. */
function texteDepuisHtml(html: string): string {
  return desechapper(
    html
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/\s*(p|div|tr|h[1-6])\s*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blocIdentifiants(ids: IdentifiantsClient): string {
  const lignePassword = ids.motDePasse
    ? `
        <tr>
          <td style="width:105px;padding:3px 0;font-size:12px;color:#6b7280">Mot de passe</td>
          <td style="padding:3px 0;font-size:14px;font-weight:700;color:#172033">${echapper(ids.motDePasse)}</td>
        </tr>`
    : '';

  // Sans mot de passe, l'encadré doit dire pourquoi il n'y en a pas — sinon il
  // se lit comme une information manquante.
  const note = ids.motDePasse
    ? '<div style="margin-top:12px;font-size:11px;line-height:1.5;color:#6b7280">Conservez-les : ils vous serviront pour vos prochaines demandes. Ne les transmettez pas à des tiers.</div>'
    : '<div style="margin-top:12px;font-size:11px;line-height:1.5;color:#6b7280">Le bouton ci-dessus vous connecte directement, sans mot de passe. Votre identifiant sert à vous connecter depuis un autre appareil.</div>';

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0;border:1px solid #dde3ea;border-radius:10px;background:#f8fafc">
    <tr><td style="padding:16px 18px">
      <div style="margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">Votre accès à l'espace TVM38</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="width:105px;padding:3px 0;font-size:12px;color:#6b7280">Identifiant</td>
          <td style="padding:3px 0;font-size:14px;font-weight:700;color:#172033">${echapper(ids.identifiant)}</td>
        </tr>${lignePassword}
      </table>
      ${note}
    </td></tr>
  </table>`;
}

/**
 * Les trois possibilités de l'espace client.
 *
 * En tableau et non en `div` avec retrait : les clients mail ignorent une
 * partie des styles de bloc, et la ligne explicative débordait dans la marge.
 *
 * N'est affiché que sur les e-mails d'accès et sur le premier message d'un
 * dossier. Répété sur chaque notification, il était lu deux fois puis sauté —
 * et proposait « Demander un devis » juste après un refus de document.
 */
function blocEspace(): string {
  const ligne = (titre: string, detail?: string) => `
    <tr>
      <td style="width:14px;padding:0 0 10px;font-size:14px;color:#0053a1;vertical-align:top">&bull;</td>
      <td style="padding:0 0 10px;font-size:14px;line-height:1.5;color:#172033">
        ${titre}
        ${detail ? `<div style="margin-top:3px;font-size:12px;line-height:1.5;color:#6b7280">${detail}</div>` : ''}
      </td>
    </tr>`;

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-top:1px solid #eceff3">
    <tr><td style="padding:18px 0 0">
      <div style="margin-bottom:12px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">Votre espace client TVM38</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        ${ligne(
          '<strong>Renvoyer un devis signé ou un bon de commande</strong>',
          'une photo prise au téléphone suffit — nous le contrôlons puis confirmons votre commande',
        )}
        ${ligne('Voir où en sont vos dossiers', 'devis envoyé, document reçu, commande confirmée, livraison planifiée')}
        ${ligne('Demander un devis sans appeler', 'vos coordonnées sont déjà enregistrées')}
      </table>
    </td></tr>
  </table>`;
}

/** Interlocuteur + coordonnées, commun à tous les e-mails. */
function blocContact(): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:26px 0 0;border-top:1px solid #eceff3">
    <tr><td style="padding:18px 0 0">
      <div style="font-size:13px;font-weight:700;color:#0053a1;line-height:1.4">${CONTACT_TVM38.nom}</div>
      <div style="font-size:12px;color:#56708f;line-height:1.5">${CONTACT_TVM38.fonction}</div>
      <div style="margin-top:6px;font-size:12px;color:#4a5866;line-height:1.6">
        <a href="mailto:${CONTACT_TVM38.email}" style="color:#0053a1;text-decoration:none">${CONTACT_TVM38.email}</a>
        &nbsp;&middot;&nbsp;${CONTACT_TVM38.telephone}
      </div>
    </td></tr>
  </table>`;
}

/** Normalise `lienSecondaire`, qui accepte une valeur seule ou une liste. */
function liensSecondaires(gabarit: GabaritEmail): LienEmail[] {
  if (!gabarit.lienSecondaire) return [];
  return Array.isArray(gabarit.lienSecondaire) ? gabarit.lienSecondaire : [gabarit.lienSecondaire];
}

function blocAction(gabarit: GabaritEmail): string {
  if (!gabarit.bouton) return '';

  const bouton = `<a href="${echapper(gabarit.bouton.url)}" style="display:inline-block;background-color:#0053a1;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:14px 30px;border-radius:8px;letter-spacing:1px;text-transform:uppercase">${echapper(gabarit.bouton.libelle)}</a>`;

  const secondaire = liensSecondaires(gabarit)
    .map((lien) => `<div style="margin-top:12px;font-size:12px"><a href="${echapper(lien.url)}" style="color:#56708f;text-decoration:underline">${echapper(lien.libelle)}</a></div>`)
    .join('');

  // Le QR porte le même lien que le bouton : il sert au conducteur de travaux
  // qui lit l'e-mail au bureau et veut répondre depuis le chantier.
  //
  // Référencé par `cid:` et non par une `data:` URI : Gmail refuse d'afficher
  // les images en data URI, et le QR n'était qu'un cadre vide.
  const legende = gabarit.qrLegende ?? 'Scannez pour ouvrir<br>ce dossier sur votre<br>téléphone';
  const qr = gabarit.qrCodeCid
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0"><tr>
         <td style="padding-right:12px"><img src="cid:${gabarit.qrCodeCid}" alt="QR code d'accès à votre espace" width="96" height="96" style="display:block;border:1px solid #dde3ea;border-radius:8px"></td>
         <td style="font-size:12px;line-height:1.6;color:#6b7280;text-align:left">${legende}</td>
       </tr></table>`
    : '';

  return `<div style="margin:26px 0 0;text-align:center">${bouton}${secondaire}${qr}</div>`;
}

export function construireEmail(gabarit: GabaritEmail): string {
  const logo = gabarit.logoCid
    ? `<img src="cid:${gabarit.logoCid}" alt="TVM38" style="display:block;height:36px;margin-bottom:18px">`
    : `<img src="${SITE_URL}/logo-tvm38.png" alt="TVM38" style="display:block;height:36px;margin-bottom:18px">`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#e8edf2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;width:100%;border-radius:12px;background:#ffffff;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)">
      <tr><td style="background:#0053a1;color:#ffffff;padding:20px 28px">
        ${logo}
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
        ${gabarit.complement ?? ''}
        ${blocContact()}
      </td></tr>
      <tr><td style="border-top:1px solid #dde3ea;background:#f5f7fa;padding:16px 28px;font-size:11px;line-height:1.6;color:#8792a2">
        TVM38 — Carrière de matériaux<br>489 Rue de l'Isle, 38190 Villard-Bonnot<br>Midali Frères
      </td></tr>
    </table>
  </body></html>`;
}

/**
 * Version texte brut du même e-mail.
 *
 * Un message uniquement HTML est pénalisé par les filtres anti-spam, et reste
 * illisible pour qui consulte ses mails en texte. Elle est construite à partir
 * du même gabarit, donc elle ne peut pas raconter autre chose que le HTML.
 */
export function construireTexte(gabarit: GabaritEmail): string {
  const morceaux: string[] = [gabarit.titre];
  if (gabarit.sousTitre) morceaux.push(gabarit.sousTitre);
  morceaux.push('');
  morceaux.push(gabarit.corpsTexte ?? texteDepuisHtml(gabarit.corps));

  if (gabarit.encadre) {
    morceaux.push('', `${gabarit.encadre.intitule} : ${gabarit.encadre.valeur}`);
  }
  if (gabarit.bouton) {
    morceaux.push('', `${gabarit.bouton.libelle} : ${gabarit.bouton.url}`);
  }
  for (const lien of liensSecondaires(gabarit)) {
    morceaux.push(`${lien.libelle} : ${lien.url}`);
  }
  if (gabarit.identifiants) {
    morceaux.push('', `Identifiant : ${gabarit.identifiants.identifiant}`);
    if (gabarit.identifiants.motDePasse) {
      morceaux.push(`Mot de passe : ${gabarit.identifiants.motDePasse}`);
    }
  }
  if (gabarit.rappelEspace) {
    morceaux.push(
      '',
      'Votre espace client TVM38 :',
      '- Renvoyer un devis signé ou un bon de commande (une photo suffit)',
      '- Voir où en sont vos dossiers',
      '- Demander un devis sans appeler',
    );
  }

  if (gabarit.complementTexte) {
    morceaux.push('', gabarit.complementTexte);
  }

  morceaux.push(
    '',
    `${CONTACT_TVM38.nom} — ${CONTACT_TVM38.fonction}`,
    `${CONTACT_TVM38.email} · ${CONTACT_TVM38.telephone}`,
    '',
    'TVM38 — Carrière de matériaux',
    '489 Rue de l\'Isle, 38190 Villard-Bonnot — Midali Frères',
  );

  return morceaux.join('\n').replace(/\n{3,}/g, '\n\n');
}
