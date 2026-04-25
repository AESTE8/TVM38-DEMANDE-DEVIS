export interface Materiau {
  id: string;
  code: string;
  nom: string;
  section: string;
  masseVolumique: number;
}

export interface LigneDevis {
  materiauId: string;
  quantiteTonnes: number;
  quantiteM3: number;
  modeEntree: 'tonnes' | 'm3';
  type?: 'livraison' | 'decharge';
}

export type TypeClient = 'professionnel' | 'particulier';
export type TypeDemande = 'livraison' | 'fourniture' | 'decharge' | 'livraison_decharge';
export type CreneauLivraison = 'matin' | 'apres_midi' | 'indifferent';

export interface DevisFormData {
  dejaClient: 'oui' | 'non';
  typeClient: TypeClient;
  
  // Pro uniquement
  entrepriseNom?: string;
  entrepriseAdresse?: string;
  
  // Contact (commun)
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  
  fonction?: string;
  agenceNom?: string;
  typeDemande: TypeDemande;
  adresseLivraison?: string;
  dateSouhaitee?: string;
  creneau?: CreneauLivraison;
  lignes: LigneDevis[];
  notes?: string;
}
