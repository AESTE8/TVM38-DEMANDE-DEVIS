/**
 * Envoi d'e-mails transactionnels vers les clients.
 *
 * Les identifiants SMTP vivent dans la table `parametres`, comme pour la
 * notification de demande de devis : un seul endroit à changer le jour où la
 * carrière change de boîte mail.
 *
 * Aucun envoi n'est bloquant. Un serveur SMTP indisponible ne doit jamais faire
 * échouer un dépôt déjà enregistré : le client verrait une erreur alors que son
 * bon de commande est bien arrivé, et il le renverrait.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@7.0.11';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function echapperHtml(valeur: unknown): string {
  return String(valeur ?? '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere] ?? caractere);
}

interface Gabarit {
  titre: string;
  sousTitre?: string;
  corps: string;
  encadre?: { intitule: string; valeur: string };
}

/** Habillage commun aux e-mails du portail, aux couleurs de la carrière. */
export function gabaritEmail({ titre, sousTitre, corps, encadre }: Gabarit): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#e8edf2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:12px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.12)">
      <div style="background:#0053a1;color:#fff;padding:20px 28px">
        <img src="https://tvm-38-demande-devis.vercel.app/logo-tvm38.png" alt="TVM38" style="display:block;height:36px;margin-bottom:18px">
        <div style="font-size:22px;font-weight:700">${echapperHtml(titre)}</div>
        ${sousTitre ? `<div style="margin-top:5px;font-size:13px;opacity:.78">${echapperHtml(sousTitre)}</div>` : ''}
      </div>
      <div style="padding:28px;font-size:15px;line-height:1.6">
        ${corps}
        ${encadre ? `<div style="margin:22px 0;border:1px solid #b8cee7;border-radius:10px;background:#f0f6ff;padding:18px">
          <div style="margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#56708f;text-transform:uppercase">${echapperHtml(encadre.intitule)}</div>
          <div style="font-size:17px;font-weight:700;color:#0053a1">${echapperHtml(encadre.valeur)}</div>
        </div>` : ''}
      </div>
      <div style="border-top:1px solid #dde3ea;background:#f5f7fa;padding:16px 28px;font-size:11px;line-height:1.6;color:#8792a2">TVM38 — Carrière de matériaux<br>489 Rue de l'Isle, 38190 Villard-Bonnot</div>
    </div>
  </body></html>`;
}

/**
 * Envoie un e-mail. Retourne `false` en cas d'échec, sans jamais lever :
 * l'appelant décide quoi en faire, et ce n'est jamais d'annuler l'opération.
 */
export interface PieceJointeEmail {
  filename: string;
  content: string;
  encoding: 'base64';
  /** Référencée dans le HTML par `cid:<cid>`. */
  cid: string;
}

export async function envoyerEmail(
  destinataire: string,
  sujet: string,
  html: string,
  piecesJointes: PieceJointeEmail[] = [],
  texte?: string,
): Promise<boolean> {
  if (!/^\S+@\S+\.\S+$/.test(destinataire)) return false;

  try {
    const { data: params, error } = await supabase
      .from('parametres')
      .select('smtp_host,smtp_port,smtp_user,smtp_password,smtp_nom_affiche')
      .eq('id', 1)
      .maybeSingle();

    if (error || !params?.smtp_host || !params?.smtp_user || !params?.smtp_password) {
      console.error('SMTP non configuré, e-mail non envoyé à', destinataire);
      return false;
    }

    const transporteur = nodemailer.createTransport({
      host: params.smtp_host,
      port: params.smtp_port || 587,
      secure: params.smtp_port === 465,
      auth: { user: params.smtp_user, pass: params.smtp_password },
    });

    const nomAffiche = String(params.smtp_nom_affiche || 'TVM38').replace(/[\r\n\t"<>]/g, '').slice(0, 100);
    await transporteur.sendMail({
      from: `"${nomAffiche}" <${params.smtp_user}>`,
      to: destinataire,
      subject: sujet.replace(/[\r\n]/g, ' ').slice(0, 500),
      // Un message uniquement HTML pèse dans le score anti-spam — les clients
      // TVM38 sont très majoritairement derrière un filtre Microsoft 365.
      ...(texte ? { text: texte } : {}),
      html,
      attachments: piecesJointes.length > 0 ? piecesJointes : undefined,
    });
    return true;
  } catch (err) {
    console.error('Envoi e-mail échoué vers', destinataire, err);
    return false;
  }
}
