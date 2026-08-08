import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  CheckCircle2, FileCheck2, FileText, Image as ImageIcon, Loader2, Send, ShieldCheck, Trash2, Upload, X,
} from 'lucide-react';
import { formatMontant, transmettreDocumentAcceptation, type TypeDocumentAcceptation } from '@/lib/portal';
import { estImage, estPdf, imagesVersPdf } from '@/lib/imagesToPdf';
import { getConnectedClient } from '@/lib/auth';

/**
 * Le dialogue est monté à l'ouverture et démonté à la fermeture : l'état de
 * saisie naît et meurt avec lui, sans effet de réinitialisation à maintenir.
 */
interface Props {
  affaireId: string;
  devisId: string;
  numero: string;
  version: number;
  montantHT: number;
  agenceSuggeree?: string | null;
  onClose: () => void;
  onTransmis: () => Promise<void> | void;
}

const TAILLE_MAX = 25 * 1024 * 1024;
const TAILLE_MAX_LISIBLE = '25 Mo';

const MESSAGES: Record<string, string> = {
  QUOTE_VERSION_CHANGED: 'Le devis vient d’être mis à jour par TVM38. Rechargez la page et consultez la nouvelle version avant d’envoyer votre document.',
  QUOTE_NOT_ACTIONABLE: 'Ce devis n’attend plus de document.',
  ACCEPTANCE_ALREADY_VALIDATED: 'Votre acceptation a déjà été validée par TVM38.',
  PURCHASE_ORDER_REFERENCE_REQUIRED: 'Indiquez la référence de votre bon de commande.',
  SENDER_NAME_REQUIRED: 'Indiquez le nom de la personne qui transmet le document.',
  SENDER_EMAIL_REQUIRED: 'Indiquez une adresse e-mail : c’est par elle que TVM38 vous répondra.',
  FILE_REQUIRED: 'Joignez votre document.',
  FILE_TOO_LARGE: 'Le document dépasse 25 Mo, même après compression des photos. Envoyez-le en deux fois.',
  // Le devis a été republié mais son nouveau PDF n'est pas encore en ligne.
  // Laisser déposer maintenant rattacherait l'accord du client à une version
  // qu'il n'a pas lue.
  QUOTE_PDF_STALE: 'TVM38 met ce devis à jour en ce moment. Réessayez dans quelques minutes : la nouvelle version doit être en ligne avant que vous ne nous retourniez votre accord.',
  // Le même fichier, octet pour octet, a déjà été examiné et refusé. Lui
  // répondre « bien transmis » enterrait le dossier des deux côtés.
  DOCUMENT_ALREADY_REVIEWED: 'Vous nous avez déjà envoyé ce document, et il n’a pas pu être accepté. Le motif est affiché sur cette page : envoyez-nous le document corrigé.',
  INVALID_PDF: 'Le fichier n’est pas un PDF lisible.',
  UPLOAD_FAILED: 'Le dépôt sur notre espace de stockage a échoué. Réessayez dans quelques instants.',
  SERVER_MISCONFIGURED: 'Le dépôt est momentanément indisponible. Contactez TVM38.',
  SERVER_ERROR: 'Une erreur est survenue de notre côté. Réessayez, et signalez-le nous si cela persiste.',
  AFFAIRE_NOT_FOUND: 'Ce devis n’est plus rattaché à votre compte. Contactez TVM38.',
  MISSING_QUOTE: 'Devis introuvable. Rechargez la page et réessayez.',
  INVALID_DOCUMENT_TYPE: 'Choisissez le devis signé ou le bon de commande.',
  CONFIRMATIONS_REQUIRED: 'Les confirmations n’ont pas été transmises. Rechargez la page.',
  INVALID_FORM_DATA: 'Le formulaire n’a pas pu être lu. Réessayez.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous et recommencez.',
};

/**
 * Un message générique sur toute erreur inconnue rend le diagnostic
 * impossible : ni le client ni TVM38 ne savent ce qui a bloqué. Le code brut
 * est affiché en clair quand il n'est pas reconnu — laid, mais exploitable.
 */
function messageErreur(raison: unknown): string {
  const code = raison instanceof Error ? raison.message : String(raison);
  if (MESSAGES[code]) return MESSAGES[code];
  if (/^[A-Z_]{3,60}$/.test(code)) {
    return `Le document n’a pas pu être transmis (${code}). Signalez ce code à TVM38.`;
  }
  return 'Le document n’a pas pu être transmis. Vérifiez votre connexion et réessayez.';
}

function poidsLisible(octets: number): string {
  return octets < 1024 * 1024
    ? `${Math.max(1, Math.round(octets / 1024))} Ko`
    : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export default function AcceptanceDocumentDialog({
  affaireId, devisId, numero, version, montantHT, agenceSuggeree, onClose, onTransmis,
}: Props) {
  const client = useMemo(() => getConnectedClient(), []);
  const champFichier = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TypeDocumentAcceptation | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [reference, setReference] = useState('');

  // Un compte professionnel porte une raison sociale : le devis a été établi
  // pour elle, on ne peut pas signer pour une autre. Elle est donc affichée,
  // jamais saisie. Un particulier n'a pas d'entreprise à afficher.
  const entreprise = client?.type === 'particulier' ? '' : String(client?.nom ?? '').trim();

  // Préremplissage depuis le compte : c'est souvent un autre salarié qui dépose,
  // donc le nom reste modifiable. Ce qui compte pour la traçabilité — le compte,
  // l'adresse IP, la date — est enregistré côté serveur, pas saisi ici.
  const [nom, setNom] = useState(() => {
    // Sur un compte particulier, le titulaire est bien la personne.
    if (client?.type === 'particulier') {
      return [client?.prenom, client?.nom].filter(Boolean).join(' ').trim();
    }
    // Sur un compte d'entreprise, `nom` est la raison sociale : la préremplir
    // ici faisait signer « MIDALI TP » au lieu de la personne. On ne propose
    // donc un nom que lorsqu'il est certain — contact principal, ou contact
    // unique. Dans le doute, le champ reste vide et sera saisi.
    const contacts = client?.contacts ?? [];
    const certain = contacts.find((contact) => contact.principal)
      ?? (contacts.length === 1 ? contacts[0] : undefined);
    return certain ? [certain.prenom, certain.nom].filter(Boolean).join(' ').trim() : '';
  });

  // Adresses déjà connues du compte : celle de la fiche et celles des contacts
  // enregistrés. Les proposer évite la faute de frappe sur le seul champ dont
  // dépend la réponse de TVM38.
  const adressesConnues = useMemo(() => {
    const brutes = [client?.email, ...(client?.contacts ?? []).map((contact) => contact.email)];
    return [...new Set(brutes.map((valeur) => String(valeur ?? '').trim()).filter(
      (valeur) => /^\S+@\S+\.\S+$/.test(valeur),
    ))];
  }, [client]);

  const [email, setEmail] = useState(() => {
    const compte = String(client?.email ?? '').trim();
    if (/^\S+@\S+\.\S+$/.test(compte)) return compte;
    const contacts = (client?.contacts ?? [])
      .map((contact) => String(contact.email ?? '').trim())
      .filter((valeur) => /^\S+@\S+\.\S+$/.test(valeur));
    return contacts.length === 1 ? contacts[0] : '';
  });
  const [fonction, setFonction] = useState('');
  // Les suggestions d'adresses passent par une liste rendue en React : la
  // `datalist` HTML n'est honorée ni par Safari iOS ni par une partie des
  // navigateurs Android, où le champ restait muet.
  const [emailFocus, setEmailFocus] = useState(false);

  // L'agence n'est pas saisie librement : elle qualifie le devis, pas le
  // dépôt. Celle portée par le devis est affichée telle quelle ; à défaut on
  // ne propose que les agences enregistrées sur le compte.
  const agenceFigee = String(agenceSuggeree ?? '').trim();
  const agencesCompte = useMemo(
    () => [...new Set((client?.agences ?? []).map((a) => String(a.nom ?? '').trim()).filter(Boolean))],
    [client],
  );
  const [agence, setAgence] = useState(agenceFigee);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const images = fichiers.filter(estImage);
  const totalOctets = fichiers.reduce((somme, fichier) => somme + fichier.size, 0);
  const pdfJoint = fichiers.find(estPdf) ?? null;

  // Le plafond ne s'applique qu'à ce qui part tel quel. Des photos sont
  // réencodées avant l'envoi (2200 px, JPEG q0.85), soit de l'ordre d'un
  // demi-méga par page : quatre photos d'iPhone pèsent 16 Mo brutes et
  // produisent un PDF de 2 Mo. Mesurer le brut refusait des bons de commande
  // parfaitement envoyables et renvoyait le conducteur de travaux vers
  // l'e-mail — précisément le cas d'usage que ce dépôt existe pour couvrir.
  // Le contrôle qui compte est fait sur le document converti, avant l'envoi.
  const trop = pdfJoint !== null && pdfJoint.size > TAILLE_MAX;

  const choisir = (event: ChangeEvent<HTMLInputElement>) => {
    const selection = Array.from(event.target.files ?? []);
    setErreur('');
    if (selection.length === 0) return;

    // Un PDF se suffit à lui-même ; des photos se cumulent en un document
    // multipage. Mélanger les deux n'aurait pas de sens et produit un document
    // dont l'ordre des pages serait imprévisible.
    if (selection.some(estPdf)) {
      const pdf = selection.find(estPdf)!;
      setFichiers([pdf]);
    } else if (selection.every(estImage)) {
      setFichiers((precedents) => [...precedents.filter(estImage), ...selection]);
    } else {
      setErreur('Envoyez soit un PDF, soit une ou plusieurs photos.');
    }
    event.target.value = '';
  };

  const retirer = (index: number) => setFichiers((liste) => liste.filter((_, i) => i !== index));

  // L'adresse est le seul moyen de vous répondre : elle est exigée, alors
  // qu'elle était seulement affichée comme telle sans être vérifiée.
  const emailValide = /^\S+@\S+\.\S+$/.test(email.trim());

  // Une adresse déjà saisie à l'identique n'a pas à être reproposée.
  const suggestionsEmail = useMemo(() => {
    const saisie = email.trim().toLowerCase();
    return adressesConnues.filter(
      (adresse) => adresse.toLowerCase() !== saisie
        && (saisie === '' || adresse.toLowerCase().includes(saisie)),
    );
  }, [adressesConnues, email]);

  const formValide = Boolean(type)
    && fichiers.length > 0
    && !trop
    && nom.trim().length >= 3
    && emailValide
    && (type !== 'bon_commande' || reference.trim().length >= 2);

  const transmettre = async () => {
    if (!formValide || !type) return;
    setEnvoi(true);
    setErreur('');
    try {
      const converti = images.length > 0 && fichiers.length === images.length;
      const document = converti
        ? await imagesVersPdf(fichiers, `${type === 'bon_commande' ? 'bon-de-commande' : 'devis-signe'}-${numero}.pdf`)
        : fichiers[0];

      if (document.size > TAILLE_MAX) throw new Error('FILE_TOO_LARGE');

      await transmettreDocumentAcceptation(affaireId, {
        devisId,
        typeDocument: type,
        fichier: document,
        referenceBonCommande: reference.trim(),
        transmetteurNom: nom.trim(),
        transmetteurEmail: email.trim(),
        transmetteurFonction: fonction.trim(),
        transmetteurAgence: agence.trim(),
        commentaireClient: commentaire.trim(),
        convertiDepuisImages: converti,
      });
      await onTransmis();
    } catch (raison) {
      setErreur(messageErreur(raison));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'mt-1.5 min-h-11 w-full rounded-lg border border-border px-3 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="depot-titre">
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-primary/[0.06] px-5 py-4 sm:px-7">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white"><FileCheck2 className="h-5 w-5" /></span>
            <div>
              <h2 id="depot-titre" className="font-headline text-lg font-black text-on-surface">Transmettre mon accord</h2>
              <p className="mt-0.5 text-xs text-secondary">Devis {numero} · version {version} · {formatMontant(montantHT)} € HT</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={envoi} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-secondary hover:bg-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
          <fieldset>
            <legend className="text-xs font-bold text-on-surface">Comment souhaitez-vous formaliser votre accord ?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                { valeur: 'devis_signe' as const, titre: 'Le devis signé et daté', detail: 'Vous nous renvoyez ce devis avec votre signature.' },
                { valeur: 'bon_commande' as const, titre: 'Un bon de commande', detail: 'Votre bon de commande correspondant à ce devis.' },
              ]).map((choix) => (
                <label key={choix.valeur} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm transition ${type === choix.valeur ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border hover:bg-surface-container-low'}`}>
                  <input type="radio" name="type-document" checked={type === choix.valeur} onChange={() => setType(choix.valeur)} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span><span className="block font-bold text-on-surface">{choix.titre}</span><span className="mt-0.5 block text-xs text-secondary">{choix.detail}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          {type && (
            <>
              {type === 'bon_commande' && (
                <label className="block text-xs font-bold text-on-surface">
                  Référence de votre bon de commande
                  <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} placeholder="Ex. BC-2026-114" className={champ} />
                </label>
              )}

              <div>
                <p className="text-xs font-bold text-on-surface">Votre document</p>
                <button type="button" onClick={() => champFichier.current?.click()} className="mt-2 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-container-low px-4 py-6 text-center transition hover:border-primary hover:bg-primary/5">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm font-bold text-on-surface">Choisir un fichier ou prendre une photo</span>
                  <span className="text-[11px] text-secondary">PDF, ou une à plusieurs photos qui seront réunies en un seul document · {TAILLE_MAX_LISIBLE} maximum</span>
                </button>
                {/* Pas de `capture` : cet attribut force l'ouverture directe de
                    l'appareil photo sur téléphone, sans laisser le choix. Le
                    conducteur de travaux qui a déjà le bon de commande en PDF
                    dans ses fichiers, ou déjà photographié dans sa galerie, se
                    retrouvait devant l'objectif sans échappatoire. Sans
                    l'attribut, iOS et Android proposent nativement les trois
                    entrées : Photothèque, Parcourir, Appareil photo. */}
                <input ref={champFichier} type="file" accept="application/pdf,image/*" multiple onChange={choisir} className="sr-only" />

                {fichiers.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {fichiers.map((fichier, index) => (
                      <li key={`${fichier.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                        {estPdf(fichier) ? <FileText className="h-5 w-5 shrink-0 text-primary" /> : <ImageIcon className="h-5 w-5 shrink-0 text-primary" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-on-surface">{fichier.name}</span>
                          <span className="text-[11px] text-secondary">{poidsLisible(fichier.size)}{images.length > 1 && !estPdf(fichier) ? ` · page ${index + 1}` : ''}</span>
                        </span>
                        <button type="button" onClick={() => retirer(index)} aria-label={`Retirer ${fichier.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-secondary hover:bg-surface"><Trash2 className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                {trop && <p className="mt-2 text-xs font-bold text-red-700">Ce PDF dépasse {TAILLE_MAX_LISIBLE} ({poidsLisible(totalOctets)}). Envoyez-le en plusieurs fois, ou photographiez les pages.</p>}
              </div>

              {entreprise && (
                <div className="rounded-lg border border-border bg-surface-container-low px-3 py-2.5">
                  <p className="text-xs font-bold text-on-surface">Entreprise</p>
                  <p className="mt-0.5 text-sm text-on-surface">{entreprise}</p>
                  <p className="mt-1 text-[11px] text-secondary">
                    Le devis a été établi pour cette entreprise : l’accord ne peut être transmis pour une autre.
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-on-surface">Qui transmet ce document ?<input value={nom} onChange={(event) => setNom(event.target.value)} maxLength={160} placeholder="Prénom et nom" className={champ} /></label>
                <label className="text-xs font-bold text-on-surface">
                  E-mail <span className="font-normal text-secondary">(pour notre réponse)</span>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onFocus={() => setEmailFocus(true)}
                      // Le clic sur une suggestion déclenche le blur avant le
                      // clic lui-même : le `onMouseDown` de la suggestion
                      // annule ce blur, ce délai couvre le cas du clavier.
                      onBlur={() => window.setTimeout(() => setEmailFocus(false), 120)}
                      maxLength={160}
                      placeholder="prenom.nom@entreprise.fr"
                      autoComplete="email"
                      className={`${champ} ${email.trim() && !emailValide ? 'border-red-400' : ''}`}
                    />
                    {emailFocus && suggestionsEmail.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                        {suggestionsEmail.map((adresse) => (
                          <li key={adresse}>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => { setEmail(adresse); setEmailFocus(false); }}
                              className="block min-h-11 w-full px-3 text-left text-sm font-normal text-on-surface hover:bg-surface-container-low"
                            >
                              {adresse}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {email.trim() && !emailValide && (
                    <span className="mt-1 block font-normal text-[11px] text-red-700">Cette adresse ne semble pas valide.</span>
                  )}
                </label>
                <label className="text-xs font-bold text-on-surface">Fonction <span className="font-normal text-secondary">(facultatif)</span><input value={fonction} onChange={(event) => setFonction(event.target.value)} maxLength={160} placeholder="Ex. Conducteur de travaux" className={champ} /></label>
                {agenceFigee ? (
                  <div className="text-xs font-bold text-on-surface">
                    Agence
                    <p className="mt-1.5 flex min-h-11 items-center rounded-lg border border-border bg-surface-container-low px-3 text-sm font-normal text-on-surface">
                      {agenceFigee}
                    </p>
                  </div>
                ) : agencesCompte.length > 0 ? (
                  <label className="text-xs font-bold text-on-surface">
                    Agence <span className="font-normal text-secondary">(facultatif)</span>
                    <select value={agence} onChange={(event) => setAgence(event.target.value)} className={champ}>
                      <option value="">Sélectionner…</option>
                      {agencesCompte.map((nomAgence) => (
                        <option key={nomAgence} value={nomAgence}>{nomAgence}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <label className="block text-xs font-bold text-on-surface">
                Message à TVM38 <span className="font-normal text-secondary">(facultatif)</span>
                <textarea value={commentaire} onChange={(event) => setCommentaire(event.target.value)} maxLength={2000} rows={2} className={`${champ} resize-y py-2`} placeholder="Une précision sur la livraison, un contact sur place…" />
              </label>

              <div className="rounded-xl border border-border bg-surface-container-low p-4 text-sm text-on-surface">
                <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>En envoyant ce document, vous confirmez qu’il correspond au <strong>devis n° {numero}, version {version}</strong>, et que vous êtes habilité à le transmettre pour le compte de l’entreprise.</span></p>
              </div>
            </>
          )}

          {erreur && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{erreur}</div>}
        </div>

        <footer className="border-t border-border bg-white px-5 py-4 sm:px-7">
          <button type="button" disabled={!formValide || envoi} onClick={() => void transmettre()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45">
            {envoi ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {envoi ? 'Envoi en cours…' : 'Transmettre mon document d’acceptation'}
          </button>
          <p className="mt-2 text-center text-[11px] text-secondary">Votre document sera vérifié par TVM38 avant validation définitive du devis.</p>
        </footer>
      </div>
    </div>
  );
}
