import { authHeaders, clearSession } from '@/lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type StatutAffaire =
  | 'envoyee'
  | 'en_chiffrage'
  | 'devis_recu'
  | 'acceptee'
  | 'planifiee'
  | 'terminee'
  | 'sans_suite';

export interface LignePortail {
  nom: string;
  code: string | null;
  quantiteTonnes: number;
  quantiteM3: number;
  modeEntree: string;
  type: string | null;
}

export interface Affaire {
  id: string;
  statut: StatutAffaire;
  date: string;
  dateDemande: string | null;
  typeDemande: string;
  lieu: string | null;
  lignes: LignePortail[];
  numeroDevis: string | null;
  montantHT: number | null;
  montantModifie: boolean;
  pdfDisponible: boolean;
}

export interface DevisDetail {
  numero: string;
  typeDevis: string;
  dateDevis: string | null;
  dateEnvoi: string | null;
  dateEnvoiAt: string | null;
  datePlanification: string | null;
  creneau: string | null;
  adresseLivraison: string | null;
  lignes: LignePortail[];
  montantHT: number;
  montantEnvoye: number | null;
  montantModifie: boolean;
  updatedAt: string | null;
  pdfDisponible: boolean;
}

export interface DemandeDetail {
  createdAt: string;
  typeDemande: string;
  adresseLivraison: string | null;
  camionLivraison: string | null;
  enginChantier: string | null;
  dateSouhaitee: string | null;
  creneau: string | null;
  agenceNom: string | null;
  contact: string | null;
  lignes: LignePortail[];
  notes: string | null;
}

export interface EtapeTimeline {
  cle: string;
  label: string;
  date: string | null;
  atteint: boolean;
}

export interface AffaireDetail {
  id: string;
  statut: StatutAffaire;
  devisId: string | null;
  demande: DemandeDetail | null;
  devis: DevisDetail | null;
  timeline: EtapeTimeline[];
}

/** Erreur levée quand le jeton est absent, expiré ou invalide. */
export class SessionExpiree extends Error {
  constructor() {
    super('Session expirée');
    this.name = 'SessionExpiree';
  }
}

async function appel<T>(chemin: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/client-portal/${chemin}`, {
    headers: authHeaders(),
  });

  if (res.status === 401) {
    // Le serveur a rejeté le jeton : on nettoie pour éviter que l'utilisateur
    // reste bloqué sur un écran vide avec une session fantôme.
    clearSession();
    throw new SessionExpiree();
  }

  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status})`);
  }

  return (await res.json()) as T;
}

export async function fetchAffaires(): Promise<Affaire[]> {
  const data = await appel<{ affaires: Affaire[] }>('affaires');
  return data.affaires;
}

export function fetchAffaire(id: string): Promise<AffaireDetail> {
  return appel<AffaireDetail>(`affaires/${encodeURIComponent(id)}`);
}

/**
 * Ouvre le PDF du devis.
 *
 * Le fichier Drive est privé : il faut passer par l'edge function avec le jeton
 * du client. On récupère donc le PDF en mémoire puis on l'ouvre via une URL
 * blob temporaire — le lien Drive n'apparaît jamais côté navigateur.
 */
export async function ouvrirPdfDevis(devisId: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/devis-pdf?devisId=${encodeURIComponent(devisId)}`,
    { headers: authHeaders() },
  );

  if (res.status === 401) {
    clearSession();
    throw new SessionExpiree();
  }

  if (!res.ok) {
    throw new Error("Le PDF n'est pas disponible pour ce devis.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');

  // L'onglet a le temps de charger le blob avant qu'on libère la mémoire.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------------------------------------------------------------------------
// Libellés et formatage
// ---------------------------------------------------------------------------

export const STATUT_LABELS: Record<StatutAffaire, string> = {
  envoyee: 'Demande envoyée',
  en_chiffrage: 'En cours de chiffrage',
  devis_recu: 'Devis reçu',
  acceptee: 'Devis accepté',
  planifiee: 'Livraison planifiée',
  terminee: 'Livraison réalisée',
  sans_suite: 'Sans suite',
};

/** Classes Tailwind de la pastille de statut, du plus actif au plus neutre. */
export const STATUT_STYLES: Record<StatutAffaire, { pastille: string; texte: string; fond: string }> = {
  envoyee:      { pastille: 'bg-tertiary',      texte: 'text-tertiary',      fond: 'bg-tertiary/10' },
  en_chiffrage: { pastille: 'bg-tertiary',      texte: 'text-tertiary',      fond: 'bg-tertiary/10' },
  devis_recu:   { pastille: 'bg-primary',       texte: 'text-primary',       fond: 'bg-primary/10' },
  acceptee:     { pastille: 'bg-emerald-600',   texte: 'text-emerald-700',   fond: 'bg-emerald-600/10' },
  planifiee:    { pastille: 'bg-emerald-600',   texte: 'text-emerald-700',   fond: 'bg-emerald-600/10' },
  terminee:     { pastille: 'bg-secondary/60',  texte: 'text-secondary',     fond: 'bg-secondary/10' },
  sans_suite:   { pastille: 'bg-secondary/40',  texte: 'text-secondary/70',  fond: 'bg-secondary/5' },
};

export const TYPE_DEMANDE_LABELS: Record<string, string> = {
  livraison: 'Livraison',
  fourniture: 'Enlèvement carrière',
  decharge: 'Mise en décharge',
  livraison_decharge: 'Livraison + décharge',
};

export const CRENEAU_LABELS: Record<string, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  indifferent: 'Indifférent',
};

export function formatMontant(montant: number): string {
  return montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatTonnage(tonnes: number): string {
  return tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** Accepte aussi bien un ISO complet qu'une date `AAAA-MM-JJ` du logiciel. */
export function formatDate(valeur: string | null | undefined): string {
  if (!valeur) return '';
  const date = new Date(valeur.length === 10 ? `${valeur}T00:00:00` : valeur);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
