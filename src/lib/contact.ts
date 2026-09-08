// Envoi des messages du site vers l'edge function `contact-site`.
//
// Remplace les appels directs à api.web3forms.com : plus aucune donnée
// personnelle ne quitte le navigateur vers un tiers, et la clé d'accès
// publique disparaît du bundle. Même principe que l'envoi du formulaire de
// devis (`send-email`) : le destinataire est décidé côté serveur.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export type ContactType = 'identifiants' | 'ouverture_compte' | 'avis';

export interface ContactPayload {
  type: ContactType;
  nom?: string;
  email?: string;
  telephone?: string;
  entreprise?: string;
  codeClient?: string;
  /** Note de l'avis, au format « 4/5 ». */
  note?: string;
  message?: string;
  /** Piège à robots : toujours vide côté humain. */
  hp?: string;
}

/**
 * Poste le message et renvoie `true` si le serveur confirme l'envoi.
 * Lève une erreur porteuse du message serveur en cas d'échec, pour que
 * l'appelant puisse l'afficher tel quel.
 */
export async function envoyerMessageContact(payload: ContactPayload): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/contact-site`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let result: { success?: boolean; error?: string } = {};
  try {
    result = await response.json();
  } catch {
    // Réponse illisible : on retombe sur le statut HTTP.
  }

  if (!response.ok || !result.success) {
    throw new Error(result.error || "L'envoi a échoué.");
  }
  return true;
}
