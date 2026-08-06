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

const TAILLE_MAX = 15 * 1024 * 1024;

const MESSAGES: Record<string, string> = {
  QUOTE_VERSION_CHANGED: 'Le devis vient d’être mis à jour par TVM38. Rechargez la page et consultez la nouvelle version avant d’envoyer votre document.',
  QUOTE_NOT_ACTIONABLE: 'Ce devis n’attend plus de document.',
  ACCEPTANCE_ALREADY_VALIDATED: 'Votre acceptation a déjà été validée par TVM38.',
  PURCHASE_ORDER_REFERENCE_REQUIRED: 'Indiquez la référence de votre bon de commande.',
  SENDER_NAME_REQUIRED: 'Indiquez le nom de la personne qui transmet le document.',
  FILE_REQUIRED: 'Joignez votre document.',
  FILE_TOO_LARGE: 'Le fichier dépasse 15 Mo. Réduisez sa taille ou envoyez moins de photos.',
  INVALID_PDF: 'Le fichier n’est pas un PDF lisible.',
  UPLOAD_FAILED: 'Le document n’a pas pu être transmis. Réessayez dans quelques instants.',
  SERVER_MISCONFIGURED: 'Le dépôt est momentanément indisponible. Contactez TVM38.',
};

function messageErreur(raison: unknown): string {
  const code = raison instanceof Error ? raison.message : String(raison);
  return MESSAGES[code] ?? 'Le document n’a pas pu être transmis. Réessayez.';
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
  // Préremplissage depuis le compte : c'est souvent un autre salarié qui dépose,
  // donc tout reste modifiable. Ce qui compte pour la traçabilité — le compte,
  // l'adresse IP, la date — est enregistré côté serveur, pas saisi ici.
  const [nom, setNom] = useState(() => [client?.prenom, client?.nom].filter(Boolean).join(' ').trim());
  const [email, setEmail] = useState(client?.email ?? '');
  const [fonction, setFonction] = useState('');
  const [agence, setAgence] = useState(agenceSuggeree ?? '');
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const images = fichiers.filter(estImage);
  const totalOctets = fichiers.reduce((somme, fichier) => somme + fichier.size, 0);
  const trop = totalOctets > TAILLE_MAX;

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

  const formValide = Boolean(type)
    && fichiers.length > 0
    && !trop
    && nom.trim().length >= 3
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
                  <span className="text-[11px] text-secondary">PDF, ou une à plusieurs photos qui seront réunies en un seul document</span>
                </button>
                <input ref={champFichier} type="file" accept="application/pdf,image/*" multiple capture="environment" onChange={choisir} className="sr-only" />

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
                {trop && <p className="mt-2 text-xs font-bold text-red-700">Le total dépasse 15 Mo ({poidsLisible(totalOctets)}). Retirez une photo.</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-on-surface">Qui transmet ce document ?<input value={nom} onChange={(event) => setNom(event.target.value)} maxLength={160} className={champ} /></label>
                <label className="text-xs font-bold text-on-surface">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={160} className={champ} /></label>
                <label className="text-xs font-bold text-on-surface">Fonction <span className="font-normal text-secondary">(facultatif)</span><input value={fonction} onChange={(event) => setFonction(event.target.value)} maxLength={160} placeholder="Ex. Conducteur de travaux" className={champ} /></label>
                <label className="text-xs font-bold text-on-surface">Agence <span className="font-normal text-secondary">(facultatif)</span><input value={agence} onChange={(event) => setAgence(event.target.value)} maxLength={160} className={champ} /></label>
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
