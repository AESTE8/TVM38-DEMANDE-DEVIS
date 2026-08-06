/**
 * Conversion de photos en un PDF, dans le navigateur.
 *
 * Un conducteur de travaux photographie le bon de commande signé sur le capot
 * de son camion : c'est le cas le plus courant, et refuser autre chose qu'un
 * PDF revient à le renvoyer vers l'e-mail, donc à vider le dépôt contrôlé de
 * son intérêt.
 *
 * Aucune dépendance : un JPEG s'embarque tel quel dans un PDF via le filtre
 * DCTDecode, sans réencodage. Ajouter une bibliothèque PDF complète coûterait
 * quelques centaines de kilo-octets à tous les visiteurs, y compris à ceux qui
 * ne déposeront jamais de photo.
 */

const A4 = { largeur: 595.28, hauteur: 841.89 };
const MARGE = 28;
const COTE_MAX = 2200;
const QUALITE = 0.85;

export const TYPES_IMAGE_ACCEPTES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

export function estImage(fichier: File): boolean {
  return fichier.type.startsWith('image/')
    || /\.(jpe?g|png|heic|heif|webp)$/i.test(fichier.name);
}

export function estPdf(fichier: File): boolean {
  return fichier.type === 'application/pdf' || /\.pdf$/i.test(fichier.name);
}

interface ImageNormalisee {
  jpeg: Uint8Array;
  largeur: number;
  hauteur: number;
}

/**
 * Passe l'image par un canvas puis la réencode en JPEG.
 *
 * Uniformise au passage le HEIC de l'iPhone et le PNG d'une capture d'écran, et
 * borne la définition : une photo de 12 Mpx pèse plusieurs mégaoctets pour une
 * lisibilité identique une fois le document imprimé.
 */
async function normaliser(fichier: File): Promise<ImageNormalisee> {
  const url = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((resoudre, rejeter) => {
      const element = new Image();
      element.onload = () => resoudre(element);
      element.onerror = () => rejeter(new Error('IMAGE_ILLISIBLE'));
      element.src = url;
    });

    const facteur = Math.min(1, COTE_MAX / Math.max(image.naturalWidth, image.naturalHeight));
    const largeur = Math.max(1, Math.round(image.naturalWidth * facteur));
    const hauteur = Math.max(1, Math.round(image.naturalHeight * facteur));

    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    const contexte = canvas.getContext('2d');
    if (!contexte) throw new Error('CANVAS_INDISPONIBLE');
    // Un JPEG n'a pas de transparence : sans fond blanc, un PNG transparent
    // ressortirait sur un aplat noir.
    contexte.fillStyle = '#ffffff';
    contexte.fillRect(0, 0, largeur, hauteur);
    contexte.drawImage(image, 0, 0, largeur, hauteur);

    const blob = await new Promise<Blob | null>((resoudre) =>
      canvas.toBlob(resoudre, 'image/jpeg', QUALITE));
    if (!blob) throw new Error('CONVERSION_ECHOUEE');

    return { jpeg: new Uint8Array(await blob.arrayBuffer()), largeur, hauteur };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function texte(valeur: string): Uint8Array {
  const octets = new Uint8Array(valeur.length);
  for (let i = 0; i < valeur.length; i += 1) octets[i] = valeur.charCodeAt(i) & 0xff;
  return octets;
}

/** Assemble les pages en un PDF 1.4 valide, table des références comprise. */
function assembler(images: ImageNormalisee[]): Uint8Array {
  const morceaux: Uint8Array[] = [];
  const offsets: number[] = [];
  let taille = 0;

  const ecrire = (contenu: Uint8Array | string) => {
    const octets = typeof contenu === 'string' ? texte(contenu) : contenu;
    morceaux.push(octets);
    taille += octets.length;
  };
  const ouvrirObjet = (numero: number) => {
    offsets[numero] = taille;
    ecrire(`${numero} 0 obj\n`);
  };

  // 1 = catalogue, 2 = arbre des pages, puis 3 objets par image.
  const idsPages = images.map((_, index) => 3 + index * 3);
  const total = 2 + images.length * 3;

  ecrire('%PDF-1.4\n');

  ouvrirObjet(1);
  ecrire('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  ouvrirObjet(2);
  ecrire(`<< /Type /Pages /Kids [${idsPages.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>\nendobj\n`);

  images.forEach((image, index) => {
    const idPage = idsPages[index];
    const idContenu = idPage + 1;
    const idImage = idPage + 2;

    // L'image est ajustée à la page en conservant ses proportions, puis centrée.
    const echelle = Math.min(
      (A4.largeur - MARGE * 2) / image.largeur,
      (A4.hauteur - MARGE * 2) / image.hauteur,
    );
    const largeurRendue = image.largeur * echelle;
    const hauteurRendue = image.hauteur * echelle;
    const x = (A4.largeur - largeurRendue) / 2;
    const y = (A4.hauteur - hauteurRendue) / 2;

    ouvrirObjet(idPage);
    ecrire(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.largeur.toFixed(2)} ${A4.hauteur.toFixed(2)}] ` +
      `/Resources << /XObject << /Im0 ${idImage} 0 R >> >> /Contents ${idContenu} 0 R >>\nendobj\n`,
    );

    const flux = `q\n${largeurRendue.toFixed(2)} 0 0 ${hauteurRendue.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    ouvrirObjet(idContenu);
    ecrire(`<< /Length ${flux.length} >>\nstream\n${flux}endstream\nendobj\n`);

    ouvrirObjet(idImage);
    ecrire(
      `<< /Type /XObject /Subtype /Image /Width ${image.largeur} /Height ${image.hauteur} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`,
    );
    ecrire(image.jpeg);
    ecrire('\nendstream\nendobj\n');
  });

  const debutXref = taille;
  ecrire(`xref\n0 ${total + 1}\n`);
  ecrire('0000000000 65535 f \n');
  for (let numero = 1; numero <= total; numero += 1) {
    ecrire(`${String(offsets[numero] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  ecrire(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`);

  const resultat = new Uint8Array(taille);
  let position = 0;
  for (const morceau of morceaux) {
    resultat.set(morceau, position);
    position += morceau.length;
  }
  return resultat;
}

/**
 * Convertit une ou plusieurs photos en un PDF d'une page par photo.
 * L'ordre de sélection est conservé : c'est l'ordre des pages du document.
 */
export async function imagesVersPdf(fichiers: File[], nomSouhaite: string): Promise<File> {
  if (fichiers.length === 0) throw new Error('AUCUNE_IMAGE');
  const images: ImageNormalisee[] = [];
  for (const fichier of fichiers) images.push(await normaliser(fichier));

  const pdf = assembler(images);
  // `as BlobPart` : le Uint8Array est bien accepté par Blob, mais sa signature
  // TypeScript se referme sur ArrayBuffer selon la version de lib.dom.
  return new File([pdf as BlobPart], nomSouhaite, { type: 'application/pdf' });
}
