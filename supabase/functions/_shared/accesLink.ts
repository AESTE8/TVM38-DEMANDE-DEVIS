/**
 * Lien de connexion directe envoyé au client par e-mail.
 *
 * L'URL porte un jeton signé, jamais le mot de passe : une adresse web se
 * retrouve dans l'historique du navigateur, les logs serveur, l'en-tête Referer
 * et les aperçus de lien des messageries, et un e-mail se transfère. Le jeton
 * expire, ne donne accès qu'à l'espace de ce client, et ne peut pas servir de
 * jeton de session — `verifyClientToken` le refuse explicitement côté site.
 *
 * Le secret est celui du portail, partagé par toutes les fonctions du projet.
 */
export const SITE_URL = 'https://tvm-38-demande-devis.vercel.app';

/**
 * 90 jours, aligné sur la validité des prix annoncée dans le devis.
 *
 * Il était de 30 jours, en comptant sur le mot de passe présent dans le même
 * e-mail pour prendre le relais. Le mot de passe n'y est plus — et un client
 * qui répondait à J+40 sur un devis valable trois mois tombait de toute façon
 * sur un lien mort, avec ou sans lui.
 */
const TTL_SECONDS = 90 * 24 * 60 * 60;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binaire = '';
  for (const octet of bytes) binaire += String.fromCharCode(octet);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signer(payload: Record<string, unknown>, secret: string): Promise<string> {
  const cle = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const entete = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const claims = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const donnees = `${entete}.${claims}`;
  const signature = await crypto.subtle.sign('HMAC', cle, encoder.encode(donnees));
  return `${donnees}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Destination demandée après vérification du jeton.
 *
 * `dossiers` ouvre l'espace, `nouvelle-demande` le formulaire de demande. Le
 * paramètre est volontairement un mot-clé et non un chemin : le site reste
 * libre de ses routes, et un site qui ne connaît pas encore le mot-clé pose le
 * client dans son espace au lieu de tomber sur une 404.
 */
export type DestinationAcces = 'dossiers' | 'nouvelle-demande';

/**
 * URL de connexion directe. `affaire` est l'identifiant d'affaire du portail
 * (`q:<devisId>` pour un devis direct, `d:<demandeId>` s'il vient d'une demande).
 *
 * Sans `affaire`, le lien ouvre l'ensemble de l'espace : c'est ce qu'il faut
 * pour « tous mes dossiers » et « faire une nouvelle demande », qui pointaient
 * vers la racine du site et exigeaient donc une connexion — exactement l'écran
 * qu'on cherche à supprimer.
 */
export async function lienAcces(
  clientId: string,
  secret: string,
  affaire?: string,
  vers?: DestinationAcces,
): Promise<string> {
  const maintenant = Math.floor(Date.now() / 1000);
  const jeton = await signer(
    { sub: clientId, scope: 'acces', affaire, iat: maintenant, exp: maintenant + TTL_SECONDS },
    secret,
  );
  const destination = vers ? `&vers=${encodeURIComponent(vers)}` : '';
  return `${SITE_URL}/acces?t=${encodeURIComponent(jeton)}${destination}`;
}

// Le QR vit dans son propre module, partagé avec le site : le dupliquer ici
// aurait fait une copie de plus à tenir à jour.
export { pieceJointeQr, QR_CID, qrCodeBase64 } from './qrCode.ts';

/** Identifiant d'affaire du portail pour un devis donné. */
export function affaireId(devisId: string, demandeId?: string | null): string {
  return demandeId ? `d:${demandeId}` : `q:${devisId}`;
}
