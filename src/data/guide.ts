// Moteur de l'aide au choix des matériaux.
//
// Le contenu métier (structures, épaisseurs, mises en garde) vit dans
// `guide.data.json` : c'est le fichier relu et validé par le responsable
// carrière, et c'est aussi la source du classeur
// VALIDATION-Aide-au-choix-des-materiaux.xlsx. Ne jamais dupliquer ces
// valeurs ici — ce module ne fait que les typer et les calculer.
import data from './guide.data.json';
import { MATERIAUX } from './materiaux';
import { Materiau } from '@/types';

export type CleCompactage = 'compactee' | 'non_compactee' | 'terre_vegetale';
export type ModeMesure = 'surface' | 'tranchee' | 'volume';

export interface Coefficient {
  valeur: number;
  libelle: string;
  explication: string;
}

export interface Couche {
  role: string;
  materiauId: string;
  epaisseurCm: number;
  compactage: CleCompactage;
}

export interface VarianteProjet {
  id: string;
  label: string;
  aide?: string;
  modeMesure: ModeMesure;
  couches: Couche[];
  note?: string;
  nonFourni?: string;
}

export interface Projet {
  id: string;
  label: string;
  icone: string;
  question2: string;
  variantes: VarianteProjet[];
}

export interface ReponseDecharge {
  id: string;
  label: string;
  materiauId: string;
}

export interface OrigineDecharge {
  id: string;
  label: string;
  question2: string | null;
  reponses: ReponseDecharge[];
  note?: string;
}

export interface InfoMateriau {
  usages: string[];
  resume: string;
  eviter: string | null;
}

export const COEFFICIENTS = data.coefficients as Record<CleCompactage, Coefficient>;
export const PROJETS = data.projets as Projet[];
export const DECHARGE = data.decharge as { question1: string; origines: OrigineDecharge[] };
export const INFOS_MATERIAUX = data.materiaux as Record<string, InfoMateriau>;

/** Mention affichée sous chaque résultat de l'assistant. */
export const MENTION_INDICATIVE =
  "Estimation indicative pour vous aider à commander. Pour un ouvrage soumis à charge lourde, faites valider par votre maçon.";

// --- usages ------------------------------------------------------------------

/** Libellés des filtres rapides, dans l'ordre d'affichage. */
export const USAGES: { id: string; label: string }[] = [
  { id: 'fondation', label: 'Fondation' },
  { id: 'finition', label: 'Finition' },
  { id: 'allee', label: 'Allée' },
  { id: 'drainage', label: 'Drainage' },
  { id: 'paysager', label: 'Paysager' },
  { id: 'remblai', label: 'Remblai' },
  { id: 'enrochement', label: 'Enrochement' },
  { id: 'beton', label: 'Béton' },
  { id: 'enrobage-reseau', label: 'Enrobage réseau' },
  { id: 'lit-de-pose', label: 'Lit de pose' },
  { id: 'reparation', label: 'Réparation' },
];

export function infoMateriau(materiauId: string): InfoMateriau | undefined {
  return INFOS_MATERIAUX[materiauId];
}

export function materiau(materiauId: string): Materiau | undefined {
  return MATERIAUX.find(m => m.id === materiauId);
}

export function aUsage(materiauId: string, usageId: string): boolean {
  return INFOS_MATERIAUX[materiauId]?.usages.includes(usageId) ?? false;
}

// --- calcul ------------------------------------------------------------------

export type Mesure =
  | { type: 'surface'; surfaceM2: number }
  | { type: 'volume'; volumeM3: number };

export interface CoucheCalculee {
  role: string;
  materiau: Materiau;
  epaisseurCm: number;
  compactage: CleCompactage;
  coefficient: number;
  volumeGeometriqueM3: number;
  volumeCommandeM3: number;
  tonnes: number;
}

const arrondi = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Tonnes = volume géométrique × coefficient de compactage × densité.
 * Le coefficient dépend du rôle de la couche : une fondation compactée perd
 * ~20 % de volume, un gravier de drainage n'en perd pas. Sans cette marge, la
 * commande est systématiquement courte sur chantier.
 */
export function calculerCouches(variante: VarianteProjet, mesure: Mesure): CoucheCalculee[] {
  return variante.couches.flatMap(couche => {
    const mat = materiau(couche.materiauId);
    if (!mat) return [];

    const coefficient = COEFFICIENTS[couche.compactage].valeur;
    const volumeGeometriqueM3 =
      mesure.type === 'surface'
        ? mesure.surfaceM2 * (couche.epaisseurCm / 100)
        : mesure.volumeM3;
    const volumeCommandeM3 = volumeGeometriqueM3 * coefficient;

    return [{
      role: couche.role,
      materiau: mat,
      epaisseurCm: couche.epaisseurCm,
      compactage: couche.compactage,
      coefficient,
      volumeGeometriqueM3: arrondi(volumeGeometriqueM3, 2),
      volumeCommandeM3: arrondi(volumeCommandeM3, 2),
      tonnes: arrondi(volumeCommandeM3 * mat.masseVolumique, 1),
    }];
  });
}

/** Résumé texte repris dans les notes de la demande, pour que TVM38 voie le contexte. */
export function resumeParcours(
  projet: Projet,
  variante: VarianteProjet,
  mesure: Mesure,
  couches: CoucheCalculee[],
  dimensions?: { longueur?: number; largeur?: number; hauteur?: number },
): string {
  const lignes: string[] = ['— Assistant matériaux —', `Projet : ${projet.label}, ${variante.label.toLowerCase()}`];

  if (mesure.type === 'surface') {
    const d = dimensions?.longueur && dimensions?.largeur
      ? `${dimensions.longueur} × ${dimensions.largeur} m = ${arrondi(mesure.surfaceM2)} m²`
      : `${arrondi(mesure.surfaceM2)} m²`;
    lignes.push(`Surface : ${d}`);
  } else {
    lignes.push(`Volume : ${arrondi(mesure.volumeM3, 2)} m³`);
  }

  couches.forEach(c => {
    const ep = c.epaisseurCm > 0 ? ` ${c.epaisseurCm} cm` : '';
    lignes.push(`${c.role}${ep} → ${c.materiau.nom} (${c.tonnes} t)`);
  });
  lignes.push('—');

  return lignes.join('\n');
}
