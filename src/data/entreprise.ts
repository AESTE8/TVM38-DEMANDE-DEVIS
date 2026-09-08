// Identité juridique publiée dans les mentions légales et la politique de
// confidentialité.
//
// Sources vérifiées les 2026-09-07 et 2026-09-08 :
//  - mentions légales officielles MIDALI (pied de page commercial) : forme
//    juridique, capital social, RCS, SIRET, code APE, TVA ;
//  - recherche-entreprises.api.gouv.fr : dénomination, SIREN, SIRET de
//    l'établissement TVM38, adresses, dirigeants ;
//  - BODACC (bodacc-datadila.opendatasoft.com) : greffe d'immatriculation,
//    « Greffe du Tribunal de Commerce de Grenoble » ;
//  - VIES, système de la Commission européenne : numéro de TVA validé
//    (isValid: true, raison sociale et adresse concordantes) ;
//  - vercel.com/legal/privacy-policy : adresse postale de l'hébergeur.
//
// Le VIES renvoie « SA ENTREPRISE MIDALI FRERES », donnée périmée : les
// mentions officielles de l'entreprise confirment la forme SAS, cohérente avec
// la catégorie juridique 5710 de l'INSEE.

export const ENTREPRISE = {
  denomination: 'ENTREPRISE MIDALI FRERES',
  nomCommercial: 'MIDALI - TVM38',
  formeJuridique: 'Société par actions simplifiée (SAS)',
  capitalSocial: '420 000 euros',
  siegeSocial: "33 Zone d'Activité La Chandelière, 38570 Goncelin",
  etablissement: "489 Rue de l'Isle, 38190 Villard-Bonnot",
  siren: '057 500 902',
  siretEtablissement: '057 500 902 00028',
  rcs: 'RCS Grenoble B 057 500 902',
  tvaIntracommunautaire: 'FR 52 057 500 902',
  codeNaf: '38.11Z',
  directeurPublication: 'Nicolas MIDALI, Président',
  telephone: '06 20 72 19 60',
  telephoneLien: 'tel:0620721960',
  email: 'tvm38@midali.fr',
  contactCarriere: 'Maxime ROMANET, Responsable de Carrière',
} as const;

export const HEBERGEUR = {
  // Hébergement du site et des pages.
  nom: 'Vercel Inc.',
  adresse: '440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis',
  contact: 'https://vercel.com',
  // Base de données, fonctions serveur et stockage des pièces jointes.
  baseDeDonnees: 'Supabase Inc.',
  baseDeDonneesRegion: 'Union européenne — région Paris (eu-west-3)',
} as const;

/** Date de dernière révision des textes légaux, affichée en pied de page. */
export const DATE_MAJ_LEGALE = '8 septembre 2026';
