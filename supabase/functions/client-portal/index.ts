// Supabase Edge Function — client-portal v1
// Alimente l'espace personnel du client : le fil de ses affaires (demandes de
// devis et devis reçus) et le détail de chacune.
//
// Principes :
//  - Le client est identifié par le JWT signé émis par `auth-client`. Aucune
//    donnée n'est servie sans jeton valide, et le filtrage se fait sur
//    `token.sub` — jamais sur un identifiant fourni par l'appelant.
//  - On lit `devis` en direct : c'est la même ligne que celle qu'édite le
//    logiciel de la carrière. Aucune copie, donc aucune divergence possible
//    entre ce que voit le dispatcher et ce que voit le client.
//  - Seuls les devis formellement transmis sont exposés. Les brouillons
//    (`en_attente`) du dispatcher restent invisibles.
//
// Routes :
//   GET  /client-portal/affaires        → le fil
//   GET  /client-portal/affaires/:id    → le détail d'une affaire

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireClient } from '../_shared/crypto.ts';
import { json, preflight, requireSecret } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Le logiciel de la carrière gère sept états : en_attente, envoye, accepte,
// refuse, planifie, termine, archive.

/** États d'un devis considérés comme transmis au client. */
const ETATS_VISIBLES = ['envoye', 'accepte', 'planifie', 'termine'];

/**
 * États d'un devis qui signifient « le dispatcher a la demande en main ».
 * Leur contenu n'est jamais exposé — seule leur existence l'est, pour que le
 * client sache que sa demande avance. `archive` en est exclu : un devis
 * abandonné ne veut pas dire qu'on travaille dessus.
 */
const ETATS_EN_COURS = ['en_attente'];

/**
 * États d'un devis qui closent l'affaire sans livraison.
 * Leur contenu n'est pas exposé — une offre refusée ou archivée n'a plus à être
 * consultée — mais la demande, elle, ne doit pas rester bloquée sur « Demande
 * envoyée » : le client verrait une affaire éternellement en attente.
 *
 * À noter : le logiciel prévoit un passage automatique en `refuse` au bout de
 * 90 jours puis en `archive` 5 jours plus tard. Ce job n'est pas actif sur la
 * base actuelle, mais s'il l'était, il ferait tomber ici les devis expirés.
 */
const ETATS_CLOS = ['refuse', 'archive'];

type Statut =
  | 'envoyee'      // demande reçue, pas encore traitée
  | 'en_chiffrage' // le dispatcher travaille dessus
  | 'devis_recu'   // un devis a été transmis
  | 'acceptee'     // le client a donné son accord
  | 'planifiee'    // la livraison est calée à une date
  | 'terminee'     // livrée / réalisée
  | 'sans_suite';

interface LigneDevis {
  materiauId?: string;
  quantiteTonnes?: number;
  quantiteM3?: number;
  modeEntree?: string;
  type?: string;
}

/** Colonnes de `devis` sélectionnées par cette fonction. */
interface DevisRow {
  id: string;
  numero_devis: string;
  demande_id: string | null;
  type_devis: string;
  etat: string;
  date_devis: string | null;
  date_envoi: string | null;
  date_envoi_at: string | null;
  adresse_livraison: string | null;
  creneau_livraison: string | null;
  date_planification: string | null;
  lignes: unknown;
  montant_total_ht: number;
  montant_envoye: number | null;
  updated_at: string | null;
  drive_file_id: string | null;
  created_at: string;
}

interface DemandeRow {
  id: string;
  client_id: string | null;
  statut: string;
  type_demande: string;
  adresse_livraison: string | null;
  camion_livraison: string | null;
  engin_chantier: string | null;
  date_souhaitee: string | null;
  creneau: string | null;
  agence_nom: string | null;
  contact_nom: string | null;
  contact_prenom: string | null;
  lignes: unknown;
  notes: string | null;
  created_at: string;
}

type Materiaux = Map<string, { nom: string; code: string }>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statutDepuisDevis(etat: string): Statut {
  if (etat === 'accepte') return 'acceptee';
  if (etat === 'planifie') return 'planifiee';
  if (etat === 'termine') return 'terminee';
  if (etat === 'refuse') return 'sans_suite';
  return 'devis_recu';
}

function statutDepuisDemande(statutDemande: string): Statut {
  if (statutDemande === 'sans_suite') return 'sans_suite';
  if (statutDemande === 'en_traitement' || statutDemande === 'devisee') return 'en_chiffrage';
  return 'envoyee';
}

/**
 * Statut d'une affaire née d'une demande web.
 *
 * L'ordre compte : un devis transmis prime, puis l'existence d'un brouillon,
 * puis le statut porté par la demande elle-même.
 *
 * Le rattrapage par le brouillon est ce qui rend le suivi vivant sans rien
 * demander au logiciel de la carrière. `demandes.statut` ne bouge que si le
 * dispatcher le met à jour à la main ; tant qu'il ne le fait pas, une demande
 * déjà en cours de chiffrage resterait affichée « Demande envoyée ». Or créer un
 * devis rattaché à la demande, c'est précisément commencer à la chiffrer.
 */
function statutAffaire(
  dem: DemandeRow,
  devisVisible: DevisRow | null,
  devisLies: DevisRow[],
): Statut {
  if (devisVisible) return statutDepuisDevis(devisVisible.etat);
  if (dem.statut === 'sans_suite') return 'sans_suite';
  if (devisLies.some((d) => ETATS_EN_COURS.includes(d.etat))) return 'en_chiffrage';
  // Plus aucun devis vivant sur cette demande : l'affaire est close.
  if (devisLies.length > 0 && devisLies.every((d) => ETATS_CLOS.includes(d.etat))) return 'sans_suite';
  return statutDepuisDemande(dem.statut);
}

/**
 * Le montant a-t-il bougé depuis l'envoi ?
 * `montant_envoye` est figé par un trigger au moment où le devis part. Si le
 * dispatcher modifie ensuite le devis, les deux valeurs divergent et l'espace
 * client peut le dire explicitement au lieu de laisser le client face à deux
 * chiffres contradictoires (celui de son email, celui du site).
 */
function montantModifie(devis: { montant_total_ht: number; montant_envoye: number | null }): boolean {
  if (devis.montant_envoye === null || devis.montant_envoye === undefined) return false;
  // Tolérance au centime : `montant_total_ht` est un `real`, les comparaisons
  // strictes sur flottants produiraient de faux positifs.
  return Math.abs(devis.montant_total_ht - devis.montant_envoye) >= 0.01;
}

/** Enrichit les lignes avec le nom des matériaux. Aucun prix unitaire n'est exposé. */
function mapLignes(lignes: unknown, materiaux: Materiaux) {
  if (!Array.isArray(lignes)) return [];
  return (lignes as LigneDevis[])
    .filter((l) => (l?.quantiteTonnes ?? 0) > 0 || (l?.quantiteM3 ?? 0) > 0)
    .map((l) => {
      const mat = l.materiauId ? materiaux.get(l.materiauId) : undefined;
      return {
        nom: mat?.nom ?? 'Matériau',
        code: mat?.code ?? null,
        quantiteTonnes: l.quantiteTonnes ?? 0,
        quantiteM3: l.quantiteM3 ?? 0,
        modeEntree: l.modeEntree ?? 'tonnes',
        type: l.type ?? null,
      };
    });
}

async function chargerMateriaux(): Promise<Materiaux> {
  const { data } = await supabase.from('materiaux').select('id, nom, code');
  const map: Materiaux = new Map();
  for (const m of data ?? []) map.set(m.id, { nom: m.nom, code: m.code });
  return map;
}

/**
 * Charge tout ce qui appartient au client.
 * Les devis sont récupérés quel que soit leur état : connaître l'existence d'un
 * brouillon permet d'afficher « en cours de chiffrage » sans jamais en révéler
 * le contenu.
 */
async function chargerAffaires(clientId: string) {
  const [demandesRes, devisRes] = await Promise.all([
    supabase
      .from('demandes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('devis')
      .select(
        'id, numero_devis, demande_id, type_devis, etat, date_devis, date_envoi, date_envoi_at, ' +
        'adresse_livraison, creneau_livraison, date_planification, lignes, montant_total_ht, ' +
        'montant_envoye, updated_at, drive_file_id, created_at',
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    demandes: (demandesRes.data ?? []) as DemandeRow[],
    devis: (devisRes.data ?? []) as DevisRow[],
  };
}

// ---------------------------------------------------------------------------
// Construction du fil
// ---------------------------------------------------------------------------

/**
 * Regroupe les devis par demande, du plus récent au plus ancien.
 * On garde la liste entière plutôt que le seul devis le plus récent : un
 * brouillon créé après un devis déjà envoyé masquerait sinon ce dernier.
 */
function grouperParDemande(devis: DevisRow[]): Map<string, DevisRow[]> {
  const parDemande = new Map<string, DevisRow[]>();
  for (const d of devis) {
    if (!d.demande_id) continue;
    const liste = parDemande.get(d.demande_id);
    if (liste) liste.push(d);
    else parDemande.set(d.demande_id, [d]);
  }
  for (const liste of parDemande.values()) {
    liste.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }
  return parDemande;
}

/** Le devis transmis le plus récent parmi ceux rattachés à une demande. */
function devisTransmis(devisLies: DevisRow[]): DevisRow | null {
  return devisLies.find((d) => ETATS_VISIBLES.includes(d.etat)) ?? null;
}

function construireFil(demandes: DemandeRow[], devis: DevisRow[], materiaux: Materiaux) {
  const devisParDemande = grouperParDemande(devis);

  const affaires = [];

  // 1. Les demandes du client, enrichies du devis qui leur répond
  for (const dem of demandes) {
    const devisLies = devisParDemande.get(dem.id) ?? [];
    const devisVisible = devisTransmis(devisLies);

    // Dès qu'un devis a été transmis, c'est lui que décrit la carte : elle en
    // porte déjà le numéro, le montant et le PDF. Reprendre les matériaux, le
    // lieu ou le type depuis la demande d'origine ferait cohabiter deux
    // versions de la même affaire — le dispatcher ajoute un matériau, le
    // montant bouge sur la carte mais le résumé continue d'annoncer l'ancienne
    // liste. La demande reste consultable telle qu'envoyée, sur le détail.
    const source = devisVisible ?? dem;
    const lignes = mapLignes(source.lignes, materiaux);

    affaires.push({
      id: `d:${dem.id}`,
      statut: statutAffaire(dem, devisVisible, devisLies),
      date: devisVisible?.date_envoi_at ?? devisVisible?.created_at ?? dem.created_at,
      dateDemande: dem.created_at,
      typeDemande: devisVisible?.type_devis ?? dem.type_demande,
      lieu: (devisVisible?.adresse_livraison || dem.adresse_livraison) || null,
      lignes,
      numeroDevis: devisVisible?.numero_devis ?? null,
      montantHT: devisVisible ? devisVisible.montant_total_ht : null,
      montantModifie: devisVisible ? montantModifie(devisVisible) : false,
      pdfDisponible: Boolean(devisVisible?.drive_file_id),
    });
  }

  // 2. Les devis créés directement par la carrière (demande passée par
  //    téléphone, au comptoir…). Ils appartiennent au client au même titre.
  for (const d of devis) {
    if (d.demande_id && demandes.some((dem) => dem.id === d.demande_id)) continue;
    if (!ETATS_VISIBLES.includes(d.etat)) continue;

    affaires.push({
      id: `q:${d.id}`,
      statut: statutDepuisDevis(d.etat),
      date: d.date_envoi_at ?? d.created_at,
      dateDemande: null,
      typeDemande: d.type_devis,
      lieu: d.adresse_livraison || null,
      lignes: mapLignes(d.lignes, materiaux),
      numeroDevis: d.numero_devis,
      montantHT: d.montant_total_ht,
      montantModifie: montantModifie(d),
      pdfDisponible: Boolean(d.drive_file_id),
    });
  }

  affaires.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return affaires;
}

// ---------------------------------------------------------------------------
// Détail d'une affaire
// ---------------------------------------------------------------------------

function detailDevis(d: DevisRow, materiaux: Materiaux) {
  return {
    numero: d.numero_devis,
    typeDevis: d.type_devis,
    dateDevis: d.date_devis || null,
    dateEnvoi: d.date_envoi || null,
    dateEnvoiAt: d.date_envoi_at ?? null,
    datePlanification: d.date_planification || null,
    creneau: d.creneau_livraison || null,
    adresseLivraison: d.adresse_livraison || null,
    lignes: mapLignes(d.lignes, materiaux),
    montantHT: d.montant_total_ht,
    montantEnvoye: d.montant_envoye ?? null,
    montantModifie: montantModifie(d),
    updatedAt: d.updated_at ?? null,
    pdfDisponible: Boolean(d.drive_file_id),
    // Volontairement absents : notes internes, coûts de péage, taux de remise,
    // chauffeur, statut de paiement. Ce sont des données de gestion interne.
  };
}

function detailDemande(dem: DemandeRow, materiaux: Materiaux) {
  return {
    createdAt: dem.created_at,
    typeDemande: dem.type_demande,
    adresseLivraison: dem.adresse_livraison || null,
    camionLivraison: dem.camion_livraison || null,
    enginChantier: dem.engin_chantier || null,
    dateSouhaitee: dem.date_souhaitee || null,
    creneau: dem.creneau || null,
    agenceNom: dem.agence_nom || null,
    contact: [dem.contact_prenom, dem.contact_nom].filter(Boolean).join(' ') || null,
    lignes: mapLignes(dem.lignes, materiaux),
    notes: dem.notes || null,
  };
}

function construireTimeline(
  statut: Statut,
  dateDemande: string | null,
  devis: { dateEnvoiAt: string | null; datePlanification: string | null } | null,
) {
  if (statut === 'sans_suite') {
    return [
      { cle: 'envoyee', label: 'Demande envoyée', date: dateDemande, atteint: true },
      { cle: 'sans_suite', label: 'Sans suite', date: null, atteint: true },
    ];
  }

  const ordre: Statut[] = ['envoyee', 'en_chiffrage', 'devis_recu', 'acceptee', 'planifiee', 'terminee'];
  const labels: Record<string, string> = {
    envoyee: 'Demande envoyée',
    en_chiffrage: 'En cours de chiffrage',
    devis_recu: 'Devis reçu',
    acceptee: 'Devis accepté',
    planifiee: 'Livraison planifiée',
    terminee: 'Livraison réalisée',
  };

  const index = ordre.indexOf(statut);

  // Une date n'est portée que par les étapes dont on sait dater le passage.
  // `acceptee` n'en a pas : le logiciel ne conserve pas la date d'accord, et
  // afficher `updated_at` reviendrait à dater l'accord d'une modification
  // quelconque du devis. Mieux vaut une étape sans date qu'une date fausse.
  const dates: Partial<Record<Statut, string | null>> = {
    envoyee: dateDemande,
    devis_recu: devis?.dateEnvoiAt ?? null,
    planifiee: devis?.datePlanification ?? null,
  };

  return ordre.map((cle, i) => {
    const atteint = i <= index;
    return {
      cle,
      label: labels[cle],
      date: atteint ? dates[cle] ?? null : null,
      atteint,
    };
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'GET') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  let jwtSecret: string;
  try {
    jwtSecret = requireSecret('CLIENT_JWT_SECRET');
  } catch (err) {
    console.error('Configuration invalide :', err);
    return json(500, { error: 'SERVER_MISCONFIGURED' });
  }

  const token = await requireClient(req, jwtSecret);
  if (!token) return json(401, { error: 'UNAUTHENTICATED' });

  const url = new URL(req.url);
  // Le chemin est préfixé par le nom de la fonction : /client-portal/affaires/...
  const segments = url.pathname.split('/').filter(Boolean);
  const apres = segments.slice(segments.indexOf('client-portal') + 1);

  if (apres[0] !== 'affaires') return json(404, { error: 'NOT_FOUND' });

  const materiaux = await chargerMateriaux();
  const { demandes, devis } = await chargerAffaires(token.sub);

  // ---- Liste ----
  if (apres.length === 1) {
    return json(200, { affaires: construireFil(demandes, devis, materiaux) });
  }

  // ---- Détail ----
  const affaireId = decodeURIComponent(apres[1]);
  const separateur = affaireId.indexOf(':');
  if (separateur === -1) return json(400, { error: 'INVALID_ID' });

  const prefixe = affaireId.slice(0, separateur);
  const brutId = affaireId.slice(separateur + 1);

  if (prefixe === 'd') {
    const dem = demandes.find((x) => x.id === brutId);
    if (!dem) return json(404, { error: 'NOT_FOUND' });

    const devisLies = grouperParDemande(devis).get(dem.id) ?? [];
    const devisVisible = devisTransmis(devisLies);

    const statut = statutAffaire(dem, devisVisible, devisLies);
    const devisDetail = devisVisible ? detailDevis(devisVisible, materiaux) : null;

    return json(200, {
      id: affaireId,
      statut,
      devisId: devisVisible?.id ?? null,
      demande: detailDemande(dem, materiaux),
      devis: devisDetail,
      timeline: construireTimeline(statut, dem.created_at, devisDetail),
    });
  }

  if (prefixe === 'q') {
    const d = devis.find((x) => x.id === brutId && ETATS_VISIBLES.includes(x.etat));
    if (!d) return json(404, { error: 'NOT_FOUND' });

    const statut = statutDepuisDevis(d.etat);
    const devisDetail = detailDevis(d, materiaux);

    return json(200, {
      id: affaireId,
      statut,
      devisId: d.id,
      demande: null,
      devis: devisDetail,
      timeline: construireTimeline(statut, null, devisDetail),
    });
  }

  return json(400, { error: 'INVALID_ID' });
});
