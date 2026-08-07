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
const ETATS_VISIBLES = ['envoye', 'accepte', 'refuse', 'planifie', 'termine'];

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
  | 'document_recu'           // justificatif déposé, en attente de contrôle
  | 'regularisation_demandee' // le justificatif doit être corrigé
  | 'acceptee'     // le contrôle interne a validé le justificatif
  | 'planifiee'    // la livraison est calée à une date
  | 'terminee'     // livrée / réalisée
  | 'modification_demandee'
  | 'remplacee'    // un devis plus récent a pris le relais
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
  nom_chantier: string | null;
  reference_client: string | null;
  client_action: string | null;
  client_action_at: string | null;
  client_action_message: string | null;
  document_version: number;
  pdf_sha256: string | null;
  acceptation_status: string;
  document_acceptation_actif_id: string | null;
  acceptation_validated_at: string | null;
  remplace_par_devis_id: string | null;
  created_at: string;
}

/** Colonnes exposables d'un justificatif. `drive_file_id` n'en fait pas partie. */
interface DocumentRow {
  id: string;
  devis_id: string;
  devis_version: number;
  type_document: 'devis_signe' | 'bon_commande';
  reference_bon_commande: string | null;
  nom_fichier_original: string;
  taille_octets: number;
  sha256: string;
  nb_pages: number | null;
  statut: string;
  transmetteur_nom: string;
  commentaire_controle: string | null;
  depose_at: string;
  controle_at: string | null;
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
  nom_chantier: string | null;
  reference_client: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  demande_id: string | null;
  devis_id: string | null;
  auteur: 'client' | 'tvm38';
  type: 'message' | 'demande_modification' | 'systeme';
  contenu: string;
  lu_par_client_at: string | null;
  created_at: string;
}

type Materiaux = Map<string, { nom: string; code: string }>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Statut lisible d'un devis.
 *
 * Le dépôt d'un justificatif ne rend pas l'affaire acceptée : il la met en
 * attente de vérification. Confondre les deux ferait croire au client que la
 * carrière s'est engagée alors que personne n'a encore ouvert son document.
 */
function statutDepuisDevis(
  devis: Pick<DevisRow, 'etat' | 'client_action' | 'acceptation_status' | 'remplace_par_devis_id'>,
): Statut {
  // `archive` a deux causes : un devis remplacé par un plus récent, ou un devis
  // expiré par le job des 90 jours prévu dans le logiciel. Seul le premier
  // pointe vers son remplaçant, et seul lui doit être annoncé comme remplacé.
  if (devis.etat === 'archive') {
    return devis.remplace_par_devis_id ? 'remplacee' : 'sans_suite';
  }
  if (devis.etat === 'accepte') return 'acceptee';
  if (devis.etat === 'planifie') return 'planifiee';
  if (devis.etat === 'termine') return 'terminee';
  if (devis.etat === 'refuse') return 'sans_suite';
  if (devis.etat === 'envoye') {
    if (devis.acceptation_status === 'document_recu') return 'document_recu';
    if (devis.acceptation_status === 'regularisation_demandee') return 'regularisation_demandee';
    if (devis.client_action === 'modification_demandee') return 'modification_demandee';
  }
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
  if (devisVisible) return statutDepuisDevis(devisVisible);
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
  // Tolérance au centime : `montant_total_ht` est un `double precision`, et
  // toute comparaison stricte de flottants produirait de faux positifs.
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
  const [demandesRes, devisRes, messagesRes, documentsRes] = await Promise.all([
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
        'montant_envoye, updated_at, drive_file_id, nom_chantier, reference_client, ' +
        'client_action, client_action_at, client_action_message, document_version, pdf_sha256, ' +
        'acceptation_status, document_acceptation_actif_id, acceptation_validated_at, ' +
        'remplace_par_devis_id, created_at',
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages_affaire')
      .select('id, demande_id, devis_id, auteur, type, contenu, lu_par_client_at, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true }),
    // `drive_file_id` n'est jamais sélectionné : le navigateur n'a aucune raison
    // de connaître un identifiant Drive, et ne pourrait rien en faire de bon.
    supabase
      .from('documents_acceptation')
      .select(
        'id, devis_id, devis_version, type_document, reference_bon_commande, ' +
        'nom_fichier_original, taille_octets, sha256, nb_pages, statut, transmetteur_nom, ' +
        'commentaire_controle, depose_at, controle_at',
      )
      .eq('client_id', clientId)
      .order('depose_at', { ascending: false }),
  ]);

  if (demandesRes.error) throw demandesRes.error;
  if (devisRes.error) throw devisRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (documentsRes.error) throw documentsRes.error;

  return {
    demandes: (demandesRes.data ?? []) as DemandeRow[],
    devis: (devisRes.data ?? []) as DevisRow[],
    messages: (messagesRes.data ?? []) as MessageRow[],
    documents: (documentsRes.data ?? []) as DocumentRow[],
  };
}

/**
 * Justificatif à afficher pour un devis : le plus récent qui compte encore.
 *
 * Un document rendu caduc par une nouvelle version reste dans l'historique,
 * mais ce n'est plus lui qui décrit l'état du dossier — sinon le client verrait
 * « document transmis » sur un devis qui en réclame un nouveau.
 *
 * `rejete` en fait partie : c'est le seul endroit où le client peut lire le
 * motif du refus, et l'e-mail de rejet lui affirme qu'il y est. L'exclure
 * renvoyait null, la page n'affichait rien, et le client rappelait la carrière
 * pour demander ce qu'on attendait de lui.
 *
 * L'index unique des documents actifs ne couvre pas `rejete`, donc un devis
 * peut en porter plusieurs. Le tri sur `depose_at` décroissant est fait à la
 * lecture : c'est bien le plus récent qui décrit l'état du dossier.
 */
function documentActif(documents: DocumentRow[], devisId: string): DocumentRow | null {
  const vivants = documents.filter(
    (doc) => doc.devis_id === devisId
      && ['a_verifier', 'valide', 'regularisation_demandee', 'rejete'].includes(doc.statut),
  );
  return vivants[0] ?? null;
}

function exposerDocument(doc: DocumentRow | null) {
  if (!doc) return null;
  return {
    id: doc.id,
    devisVersion: doc.devis_version,
    type: doc.type_document,
    referenceBonCommande: doc.reference_bon_commande,
    nomFichier: doc.nom_fichier_original,
    tailleOctets: doc.taille_octets,
    sha256: doc.sha256,
    nbPages: doc.nb_pages,
    statut: doc.statut,
    transmetteurNom: doc.transmetteur_nom,
    commentaireControle: doc.commentaire_controle,
    deposeAt: doc.depose_at,
    controleAt: doc.controle_at,
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

function messagesAffaire(messages: MessageRow[], demandeId: string | null, devisId: string | null) {
  return messages.filter((message) =>
    (demandeId !== null && message.demande_id === demandeId) ||
    (devisId !== null && message.devis_id === devisId)
  );
}

function messagePublic(message: MessageRow) {
  return {
    id: message.id,
    auteur: message.auteur,
    type: message.type,
    contenu: message.contenu,
    createdAt: message.created_at,
  };
}

function construireFil(
  demandes: DemandeRow[],
  devis: DevisRow[],
  messages: MessageRow[],
  materiaux: Materiaux,
) {
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
    const messagesDuDossier = messagesAffaire(messages, dem.id, devisVisible?.id ?? null);

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
      devisId: devisVisible?.id ?? null,
      nomChantier: devisVisible?.nom_chantier || dem.nom_chantier || null,
      referenceClient: devisVisible?.reference_client || dem.reference_client || null,
      messagesNonLus: messagesDuDossier.filter((m) => m.auteur === 'tvm38' && !m.lu_par_client_at).length,
      derniereActivite: messagesDuDossier.at(-1)?.created_at ?? null,
    });
  }

  // 2. Les devis créés directement par la carrière (demande passée par
  //    téléphone, au comptoir…). Ils appartiennent au client au même titre.
  for (const d of devis) {
    if (d.demande_id && demandes.some((dem) => dem.id === d.demande_id)) continue;
    if (!ETATS_VISIBLES.includes(d.etat)) continue;
    const messagesDuDossier = messagesAffaire(messages, null, d.id);

    affaires.push({
      id: `q:${d.id}`,
      statut: statutDepuisDevis(d),
      date: d.date_envoi_at ?? d.created_at,
      dateDemande: null,
      typeDemande: d.type_devis,
      lieu: d.adresse_livraison || null,
      lignes: mapLignes(d.lignes, materiaux),
      numeroDevis: d.numero_devis,
      montantHT: d.montant_total_ht,
      montantModifie: montantModifie(d),
      pdfDisponible: Boolean(d.drive_file_id),
      devisId: d.id,
      nomChantier: d.nom_chantier || null,
      referenceClient: d.reference_client || null,
      messagesNonLus: messagesDuDossier.filter((m) => m.auteur === 'tvm38' && !m.lu_par_client_at).length,
      derniereActivite: messagesDuDossier.at(-1)?.created_at ?? null,
    });
  }

  affaires.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return affaires;
}

// ---------------------------------------------------------------------------
// Détail d'une affaire
// ---------------------------------------------------------------------------

function detailDevis(d: DevisRow, materiaux: Materiaux, documents: DocumentRow[] = []) {
  // Passé la planification, un écart de montant n'est plus une modification de
  // devis à revalider : c'est l'ajustement au tonnage réellement livré. Le
  // client doit voir les deux chiffres, sans qu'on lui redemande quoi que ce
  // soit.
  const livraisonEngagee = ['planifie', 'termine'].includes(d.etat);

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
    nomChantier: d.nom_chantier || null,
    referenceClient: d.reference_client || null,
    clientAction: d.client_action || null,
    clientActionAt: d.client_action_at || null,
    clientActionMessage: d.client_action_message || null,
    documentVersion: d.document_version ?? 1,
    pdfSha256: d.pdf_sha256 || null,
    acceptationStatus: d.acceptation_status || 'none',
    acceptationValidatedAt: d.acceptation_validated_at || null,
    remplaceParDevisId: d.remplace_par_devis_id || null,
    // Un dépôt n'est possible que sur un devis encore ouvert, dont le PDF est
    // consultable, et qui n'a pas déjà un justificatif validé. L'empreinte,
    // elle, peut manquer sur les devis antérieurs au versionnement : elle est
    // relevée au moment du dépôt, sans quoi ces devis resteraient bloqués.
    depotPossible: d.etat === 'envoye'
      && Boolean(d.drive_file_id)
      && ['none', 'obsolete', 'rejete', 'regularisation_demandee'].includes(d.acceptation_status || 'none'),
    montantFacture: livraisonEngagee ? d.montant_total_ht : null,
    montantAjusteApresAccord: livraisonEngagee && montantModifie(d),
    documentAcceptation: exposerDocument(documentActif(documents, d.id)),
    historiqueDocuments: documents
      .filter((doc) => doc.devis_id === d.id)
      .map(exposerDocument),
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
    nomChantier: dem.nom_chantier || null,
    referenceClient: dem.reference_client || null,
  };
}

function construireTimeline(
  statut: Statut,
  dateDemande: string | null,
  devis: {
    dateEnvoiAt: string | null;
    datePlanification: string | null;
    clientActionAt?: string | null;
    documentDeposeAt?: string | null;
    documentControleAt?: string | null;
    acceptationValidatedAt?: string | null;
  } | null,
) {
  if (statut === 'sans_suite') {
    return [
      { cle: 'envoyee', label: 'Demande envoyée', date: dateDemande, atteint: true },
      { cle: 'sans_suite', label: 'Sans suite', date: null, atteint: true },
    ];
  }

  if (statut === 'modification_demandee') {
    return [
      { cle: 'envoyee', label: 'Demande envoyée', date: dateDemande, atteint: true },
      { cle: 'en_chiffrage', label: 'En cours de chiffrage', date: null, atteint: true },
      { cle: 'devis_recu', label: 'Devis reçu', date: devis?.dateEnvoiAt ?? null, atteint: true },
      { cle: 'modification_demandee', label: 'Modification demandée', date: devis?.clientActionAt ?? null, atteint: true },
    ];
  }

  if (statut === 'remplacee') {
    return [
      { cle: 'envoyee', label: 'Demande envoyée', date: dateDemande, atteint: true },
      { cle: 'devis_recu', label: 'Devis reçu', date: devis?.dateEnvoiAt ?? null, atteint: true },
      { cle: 'remplacee', label: 'Remplacé par un devis plus récent', date: null, atteint: true },
    ];
  }

  if (statut === 'regularisation_demandee') {
    return [
      { cle: 'envoyee', label: 'Demande envoyée', date: dateDemande, atteint: true },
      { cle: 'devis_recu', label: 'Devis reçu', date: devis?.dateEnvoiAt ?? null, atteint: true },
      { cle: 'document_recu', label: 'Document transmis', date: devis?.documentDeposeAt ?? null, atteint: true },
      { cle: 'regularisation_demandee', label: 'Document à corriger', date: devis?.documentControleAt ?? null, atteint: true },
    ];
  }

  // « Devis accepté » n'est atteint qu'après vérification du justificatif. Le
  // dépôt est une étape à part : afficher l'accord dès la réception ferait
  // croire au client que la carrière s'est engagée sans avoir rien ouvert.
  const ordre: Statut[] = [
    'envoyee', 'en_chiffrage', 'devis_recu', 'document_recu', 'acceptee', 'planifiee', 'terminee',
  ];
  const labels: Record<string, string> = {
    envoyee: 'Demande envoyée',
    en_chiffrage: 'En cours de chiffrage',
    devis_recu: 'Devis reçu',
    document_recu: 'Document d’acceptation transmis',
    acceptee: 'Acceptation vérifiée',
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
    document_recu: devis?.documentDeposeAt ?? null,
    acceptee: devis?.acceptationValidatedAt ?? null,
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

  const token = await requireClient(req, jwtSecret, supabase);
  if (!token) return json(401, { error: 'UNAUTHENTICATED' });

  const url = new URL(req.url);
  // Le chemin est préfixé par le nom de la fonction : /client-portal/affaires/...
  const segments = url.pathname.split('/').filter(Boolean);
  const apres = segments.slice(segments.indexOf('client-portal') + 1);

  if (apres[0] === 'profil') {
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, nom, prenom, code, type, identifiant, email, telephone, adresse, contacts, agences')
      .eq('id', token.sub)
      .single();
    if (error || !client) return json(404, { error: 'CLIENT_NOT_FOUND' });
    return json(200, { client });
  }

  if (apres[0] !== 'affaires') return json(404, { error: 'NOT_FOUND' });

  const materiaux = await chargerMateriaux();
  const { demandes, devis, messages, documents } = await chargerAffaires(token.sub);

  /** Dates du justificatif, injectées dans la timeline. */
  const jalonsDocument = (devisId: string | null) => {
    const doc = devisId ? documentActif(documents, devisId) : null;
    return { documentDeposeAt: doc?.depose_at ?? null, documentControleAt: doc?.controle_at ?? null };
  };

  // ---- Liste ----
  if (apres.length === 1) {
    return json(200, { affaires: construireFil(demandes, devis, messages, materiaux) });
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
    const devisDetail = devisVisible ? detailDevis(devisVisible, materiaux, documents) : null;

    return json(200, {
      id: affaireId,
      statut,
      devisId: devisVisible?.id ?? null,
      nomChantier: devisVisible?.nom_chantier || dem.nom_chantier || null,
      referenceClient: devisVisible?.reference_client || dem.reference_client || null,
      demande: detailDemande(dem, materiaux),
      devis: devisDetail,
      timeline: construireTimeline(
        statut,
        dem.created_at,
        devisDetail ? { ...devisDetail, ...jalonsDocument(devisVisible?.id ?? null) } : null,
      ),
      messages: messagesAffaire(messages, dem.id, devisVisible?.id ?? null).map(messagePublic),
    });
  }

  if (prefixe === 'q') {
    const d = devis.find((x) => x.id === brutId && ETATS_VISIBLES.includes(x.etat));
    if (!d) return json(404, { error: 'NOT_FOUND' });

    const statut = statutDepuisDevis(d);
    const devisDetail = detailDevis(d, materiaux, documents);

    return json(200, {
      id: affaireId,
      statut,
      devisId: d.id,
      nomChantier: d.nom_chantier || null,
      referenceClient: d.reference_client || null,
      demande: null,
      devis: devisDetail,
      timeline: construireTimeline(statut, null, { ...devisDetail, ...jalonsDocument(d.id) }),
      messages: messagesAffaire(messages, null, d.id).map(messagePublic),
    });
  }

  return json(400, { error: 'INVALID_ID' });
});
