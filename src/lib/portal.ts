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
  devisId: string | null;
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

export async function ouvrirPdfDevis(devisId: string): Promise<void> {
  // Ouverture synchrone de l'onglet pour contourner les bloqueurs de pop-ups navigateur
  const popup = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  if (popup && popup.document) {
    popup.document.title = 'Chargement du devis PDF — TVM38';
    popup.document.body.innerHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; display: flex; height: 100vh; align-items: center; justify-content: center; background-color: #f8fafc; color: #0f172a;">
        <div style="text-align: center; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; max-width: 380px;">
          <div style="width: 32px; height: 32px; border: 3px solid #1e293b; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px auto;"></div>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          <p style="font-size: 16px; font-weight: 700; margin: 0 0 6px 0;">Chargement du devis PDF</p>
          <p style="font-size: 13px; color: #64748b; margin: 0;">Veuillez patienter un instant pendant la préparation du document TVM38...</p>
        </div>
      </div>
    `;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/devis-pdf?devisId=${encodeURIComponent(devisId)}`,
      { headers: authHeaders() },
    );

    if (res.status === 401) {
      if (popup && !popup.closed) popup.close();
      clearSession();
      throw new SessionExpiree();
    }

    if (!res.ok) {
      if (popup && !popup.closed) popup.close();
      throw new Error("Le PDF n'est pas disponible pour ce devis.");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (popup && !popup.closed) {
      popup.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // L'onglet a le temps de charger le blob avant qu'on libère la mémoire.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (popup && !popup.closed) popup.close();
    throw err;
  }
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

/**
 * Regroupement des statuts pour le filtrage et les compteurs de l'espace.
 *
 * Défini une seule fois : les filtres et les statistiques de la page se
 * calculaient chacun de leur côté, et avaient fini par ne plus dire la même
 * chose — « En cours » ne comptait que les demandes non chiffrées, donc restait
 * à zéro, pendant qu'un devis planifié n'apparaissait nulle part.
 *
 * `en_cours` : le dossier avance et le client n'a rien à faire.
 * `devis_recu` : un devis attend sa décision. C'est le seul groupe actionnable.
 * `historique` : l'affaire est close, livrée ou abandonnée. La pastille de
 * chaque carte distingue les deux, le libellé du groupe n'a pas à trancher.
 */
export const GROUPES_AFFAIRE = {
  en_cours: ['envoyee', 'en_chiffrage', 'acceptee', 'planifiee'],
  devis_recu: ['devis_recu'],
  historique: ['terminee', 'sans_suite'],
} as const satisfies Record<string, readonly StatutAffaire[]>;

export type GroupeAffaire = keyof typeof GROUPES_AFFAIRE;

export function estDansGroupe(statut: StatutAffaire, groupe: GroupeAffaire): boolean {
  return (GROUPES_AFFAIRE[groupe] as readonly StatutAffaire[]).includes(statut);
}

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
