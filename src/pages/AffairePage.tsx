import { FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Download,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Send,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Truck,
  X,
} from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClientBadge from '@/components/ClientBadge';
import StatutBadge from '@/components/portal/StatutBadge';
import { getConnectedClient } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  type AffaireDetail,
  CRENEAU_LABELS,
  type LignePortail,
  SessionExpiree,
  TYPE_DEMANDE_LABELS,
  deciderDevis,
  envoyerMessage,
  fetchAffaire,
  formatDate,
  formatMontant,
  formatTonnage,
  marquerMessagesLus,
  ouvrirPdfDevis,
  updateAffaireMetadata,
} from '@/lib/portal';

const inputClass = 'min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-on-surface outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/15';

function TableauLignes({ lignes }: { lignes: LignePortail[] }) {
  if (lignes.length === 0) return <p className="text-sm text-secondary">Aucun matériau.</p>;
  return (
    <ul className="divide-y divide-border/40">
      {lignes.map((ligne, index) => (
        <li key={`${ligne.code ?? ligne.nom}-${index}`} className="flex items-baseline justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-on-surface">{ligne.nom}</p>
            {ligne.type && <p className="text-[11px] uppercase tracking-wider text-secondary/70">{ligne.type === 'decharge' ? 'Déblai à récupérer' : 'À livrer'}</p>}
          </div>
          <p className="shrink-0 text-sm font-bold text-on-surface">{formatTonnage(ligne.quantiteTonnes)} t</p>
        </li>
      ))}
    </ul>
  );
}

function Info({ icone, label, valeur }: { icone: ReactNode; label: string; valeur: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-secondary/60">{icone}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary/70">{label}</p>
        <p className="break-words text-sm text-on-surface">{valeur}</p>
      </div>
    </div>
  );
}

export default function AffairePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = getConnectedClient();
  const [affaire, setAffaire] = useState<AffaireDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [demandeOuverte, setDemandeOuverte] = useState(false);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [editionMeta, setEditionMeta] = useState(false);
  const [meta, setMeta] = useState({ nomChantier: '', referenceClient: '' });
  const [metaEnCours, setMetaEnCours] = useState(false);
  const [decision, setDecision] = useState<'refuse' | 'modification_demandee' | null>(null);
  const [motifDecision, setMotifDecision] = useState('');
  const [decisionEnCours, setDecisionEnCours] = useState(false);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [messageEnCours, setMessageEnCours] = useState(false);

  const gererErreurSession = useCallback((error: unknown) => {
    if (error instanceof SessionExpiree) {
      navigate('/', { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  const charger = useCallback(async (silencieux = false) => {
    if (!id) return;
    try {
      const data = await fetchAffaire(id);
      setAffaire(data);
      // Un rafraîchissement silencieux de la messagerie ne doit pas effacer un
      // chantier ou une référence que le client est en train de saisir.
      if (!silencieux) {
        setMeta({ nomChantier: data.nomChantier ?? '', referenceClient: data.referenceClient ?? '' });
      }
      setErreur(null);
      if (data.messages.some((message) => message.auteur === 'tvm38')) {
        void marquerMessagesLus(id).catch(() => undefined);
      }
    } catch (error) {
      if (!gererErreurSession(error)) setErreur("Cette demande est introuvable ou n'est plus accessible.");
    } finally {
      if (!silencieux) setChargement(false);
    }
  }, [gererErreurSession, id]);

  useEffect(() => {
    document.title = 'Détail de la demande — TVM38';
    const frame = window.requestAnimationFrame(() => void charger());
    return () => window.cancelAnimationFrame(frame);
  }, [charger]);

  useEffect(() => {
    const rafraichir = () => {
      if (document.visibilityState === 'visible') void charger(true);
    };
    const interval = window.setInterval(rafraichir, 30_000);
    window.addEventListener('focus', rafraichir);
    document.addEventListener('visibilitychange', rafraichir);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', rafraichir);
      document.removeEventListener('visibilitychange', rafraichir);
    };
  }, [charger]);

  async function handlePdf() {
    if (!affaire?.devisId) return;
    setPdfEnCours(true);
    try {
      await ouvrirPdfDevis(affaire.devisId);
    } catch (error) {
      if (!gererErreurSession(error)) toast.error("Le PDF n'a pas pu être ouvert.");
    } finally {
      setPdfEnCours(false);
    }
  }

  async function enregistrerMeta(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setMetaEnCours(true);
    try {
      await updateAffaireMetadata(id, meta);
      await charger(true);
      setEditionMeta(false);
      toast.success('Les informations du chantier ont été enregistrées.');
    } catch (error) {
      if (!gererErreurSession(error)) toast.error("L'enregistrement a échoué.");
    } finally {
      setMetaEnCours(false);
    }
  }

  async function appliquerDecision(choix: 'accepte' | 'refuse' | 'modification_demandee', message = '') {
    if (!id || decisionEnCours) return;
    if (choix === 'accepte' && !window.confirm('Confirmer l’acceptation de ce devis ?')) return;
    if (choix === 'modification_demandee' && !message.trim()) {
      toast.error('Précisez la modification souhaitée.');
      return;
    }
    setDecisionEnCours(true);
    try {
      await deciderDevis(id, choix, message.trim());
      await charger(true);
      setDecision(null);
      setMotifDecision('');
      toast.success(choix === 'accepte' ? 'Votre devis est accepté.' : choix === 'refuse' ? 'Votre réponse a été enregistrée.' : 'Votre demande de modification a été envoyée.');
    } catch (error) {
      if (!gererErreurSession(error)) toast.error(error instanceof Error ? error.message : "L'action a échoué.");
    } finally {
      setDecisionEnCours(false);
    }
  }

  async function posterMessage(event: FormEvent) {
    event.preventDefault();
    if (!id || !nouveauMessage.trim()) return;
    setMessageEnCours(true);
    try {
      const message = await envoyerMessage(id, nouveauMessage.trim());
      setAffaire((courante) => courante ? { ...courante, messages: [...courante.messages, message] } : courante);
      setNouveauMessage('');
      toast.success('Message envoyé à TVM38.');
    } catch (error) {
      if (!gererErreurSession(error)) toast.error("Le message n'a pas pu être envoyé.");
    } finally {
      setMessageEnCours(false);
    }
  }

  const devis = affaire?.devis ?? null;
  const demande = affaire?.demande ?? null;
  const devisActionnable = affaire?.statut === 'devis_recu' && !devis?.clientAction;

  return (
    <div className="relative flex min-h-screen flex-col bg-surface pb-24">
      <Header>{client && <ClientBadge />}</Header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-24 md:pt-32">
        <Link to="/espace" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-secondary transition-colors hover:text-primary">
          <ChevronLeft className="h-4 w-4 text-primary" /> Retour à mon espace
        </Link>

        {chargement && <div className="space-y-4" aria-live="polite"><div className="h-32 animate-pulse rounded-xl bg-surface-container" /><div className="h-64 animate-pulse rounded-xl bg-surface-container" /></div>}
        {!chargement && erreur && <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-5"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="text-sm font-bold text-destructive">Une erreur est survenue</p><p className="mt-0.5 text-sm text-destructive/80">{erreur}</p></div></div>}

        {!chargement && affaire && (
          <div className="space-y-5">
            <section className="rounded-xl border border-border/75 bg-card p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
                <StatutBadge statut={affaire.statut} />
                {devis?.numero && <span className="text-xs font-bold text-secondary">Devis n° <strong className="font-black text-on-surface">{devis.numero}</strong></span>}
              </div>
              <ol>
                {affaire.timeline.map((etape, index) => (
                  <li key={etape.cle} className="flex gap-3.5">
                    <div className="flex shrink-0 flex-col items-center">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2', etape.atteint ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-secondary/40')}>{etape.atteint && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                      {index < affaire.timeline.length - 1 && <span className={cn('h-8 w-0.5', etape.atteint ? 'bg-primary/35' : 'bg-border')} />}
                    </div>
                    <div className="min-w-0 pb-5"><p className={cn('text-sm font-bold', etape.atteint ? 'text-on-surface' : 'text-secondary/50')}>{etape.label}</p>{etape.date && <p className="text-xs text-secondary">{formatDate(etape.date)}</p>}</div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl border border-border/75 bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-widest text-secondary">Votre repère</p><h2 className="mt-1 font-headline text-lg font-black text-on-surface">Informations du chantier</h2></div>
                {!editionMeta && <button type="button" onClick={() => setEditionMeta(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-on-surface hover:border-primary/40 hover:text-primary"><Pencil className="h-4 w-4" /> Modifier</button>}
              </div>
              {editionMeta ? (
                <form onSubmit={enregistrerMeta} className="mt-4 space-y-3">
                  <div><label htmlFor="nom-chantier" className="mb-1.5 block text-xs font-bold">Nom du chantier</label><input id="nom-chantier" maxLength={120} value={meta.nomChantier} onChange={(event) => setMeta((v) => ({ ...v, nomChantier: event.target.value }))} className={inputClass} placeholder="Ex. Résidence Les Érables" /></div>
                  <div><label htmlFor="reference-client" className="mb-1.5 block text-xs font-bold">Votre référence interne</label><input id="reference-client" maxLength={80} value={meta.referenceClient} onChange={(event) => setMeta((v) => ({ ...v, referenceClient: event.target.value }))} className={inputClass} placeholder="Ex. CH-2026-014" /></div>
                  <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditionMeta(false)} className="min-h-11 rounded-lg px-4 text-xs font-bold text-secondary">Annuler</button><button disabled={metaEnCours} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-60">{metaEnCours && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button></div>
                </form>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><Info icone={<MapPin className="h-4 w-4 text-primary" />} label="Nom du chantier" valeur={affaire.nomChantier || 'À renseigner'} /><Info icone={<Tag className="h-4 w-4 text-primary" />} label="Référence client" valeur={affaire.referenceClient || 'À renseigner'} /></div>
              )}
            </section>

            {devis && (
              <section className="overflow-hidden rounded-xl border border-border/75 bg-card shadow-sm">
                <div className="flex flex-col gap-4 bg-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[11px] font-bold uppercase tracking-widest text-primary">Proposition TVM38</p><h2 className="mt-1 font-headline text-xl font-black text-on-surface">{formatMontant(devis.montantHT)} € <span className="text-xs text-secondary">HT</span></h2></div>
                  {devis.pdfDisponible && <button type="button" onClick={handlePdf} disabled={pdfEnCours} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-xs font-bold text-on-surface"><Download className="h-4 w-4 text-primary" /> {pdfEnCours ? 'Ouverture…' : 'Télécharger le PDF'}</button>}
                </div>
                <div className="p-5"><TableauLignes lignes={devis.lignes} /></div>
                {devisActionnable && (
                  <div className="border-t border-border/60 p-5">
                    <h3 className="font-headline text-base font-black text-on-surface">Votre décision</h3>
                    <p className="mt-1 text-sm text-secondary">Votre réponse est enregistrée directement dans le dossier.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button type="button" disabled={decisionEnCours} onClick={() => void appliquerDecision('accepte')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"><ThumbsUp className="h-4 w-4" /> Accepter</button>
                      <button type="button" onClick={() => setDecision('modification_demandee')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-xs font-extrabold text-amber-800"><Pencil className="h-4 w-4" /> À modifier</button>
                      <button type="button" onClick={() => setDecision('refuse')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-xs font-extrabold text-secondary hover:border-destructive/40 hover:text-destructive"><ThumbsDown className="h-4 w-4" /> Refuser</button>
                    </div>
                    {decision && <div className="mt-4 rounded-lg border border-border bg-surface-container-low p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-on-surface">{decision === 'refuse' ? 'Motif du refus (facultatif)' : 'Modification souhaitée'}</p><button type="button" onClick={() => setDecision(null)} aria-label="Fermer"><X className="h-4 w-4 text-secondary" /></button></div><textarea autoFocus maxLength={2000} rows={4} value={motifDecision} onChange={(event) => setMotifDecision(event.target.value)} className={`${inputClass} mt-3 resize-y`} placeholder={decision === 'refuse' ? 'Vous pouvez nous indiquer la raison…' : 'Décrivez précisément ce qui doit être modifié…'} /><button type="button" disabled={decisionEnCours} onClick={() => void appliquerDecision(decision, motifDecision)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-60">{decisionEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer ma réponse</button></div>}
                  </div>
                )}
                {devis.clientAction && <div className="flex gap-3 border-t border-border/60 bg-emerald-50 p-5"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-bold text-emerald-900">Réponse enregistrée</p><p className="mt-0.5 text-sm text-emerald-800">{devis.clientAction === 'accepte' ? 'Vous avez accepté ce devis.' : devis.clientAction === 'refuse' ? 'Vous avez refusé ce devis.' : 'Vous avez demandé une modification.'}</p></div></div>}
              </section>
            )}

            <section className="rounded-xl border border-border/75 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-widest text-secondary">Échanges</p><h2 className="font-headline text-lg font-black text-on-surface">Messagerie du dossier</h2></div></div>
              <div className="mt-5 space-y-3" aria-live="polite">
                {affaire.messages.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-sm text-secondary">Aucun échange pour le moment. Écrivez ici pour que votre message reste associé à ce dossier.</p>}
                {affaire.messages.map((message) => <div key={message.id} className={cn('flex', message.auteur === 'client' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[85%] rounded-xl px-4 py-3', message.auteur === 'client' ? 'bg-primary text-white' : 'border border-border bg-surface-container-low text-on-surface')}><p className="whitespace-pre-wrap text-sm leading-relaxed">{message.contenu}</p><p className={cn('mt-1.5 text-[10px]', message.auteur === 'client' ? 'text-white/70' : 'text-secondary')}>{message.auteur === 'client' ? 'Vous' : 'TVM38'} · {new Date(message.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p></div></div>)}
              </div>
              <form onSubmit={posterMessage} className="mt-4 flex flex-col gap-2 sm:flex-row"><textarea aria-label="Votre message" maxLength={2000} rows={2} value={nouveauMessage} onChange={(event) => setNouveauMessage(event.target.value)} className={`${inputClass} resize-y`} placeholder="Écrire un message à TVM38…" /><button type="submit" disabled={messageEnCours || !nouveauMessage.trim()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-white disabled:opacity-50">{messageEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer</button></form>
            </section>

            {demande && (
              <section className="overflow-hidden rounded-xl border border-border/75 bg-card shadow-sm">
                <button type="button" onClick={() => setDemandeOuverte((v) => !v)} aria-expanded={demandeOuverte} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-container-low"><div><p className="text-[11px] font-bold uppercase tracking-widest text-secondary">Détail de la demande initiale</p><p className="text-sm font-semibold text-on-surface">Soumise le {formatDate(demande.createdAt)}</p></div><ChevronDown className={cn('h-5 w-5 text-secondary transition-transform', demandeOuverte && 'rotate-180')} /></button>
                {demandeOuverte && <div className="space-y-4 border-t border-border/40 px-5 pb-5 pt-4"><div className="grid gap-3 sm:grid-cols-2"><Info icone={<Truck className="h-4 w-4 text-primary" />} label="Type de demande" valeur={TYPE_DEMANDE_LABELS[demande.typeDemande] ?? demande.typeDemande} />{demande.adresseLivraison && <Info icone={<MapPin className="h-4 w-4 text-primary" />} label="Adresse" valeur={demande.adresseLivraison} />}{demande.dateSouhaitee && <Info icone={<Calendar className="h-4 w-4 text-primary" />} label="Date souhaitée" valeur={`${formatDate(demande.dateSouhaitee)}${demande.creneau ? ` · ${CRENEAU_LABELS[demande.creneau] ?? demande.creneau}` : ''}`} />}</div><div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-secondary/70">Matériaux demandés</p><TableauLignes lignes={demande.lignes} /></div>{demande.notes && <div><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-secondary/70">Vos précisions</p><p className="whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-sm text-on-surface">{demande.notes}</p></div>}</div>}
              </section>
            )}
          </div>
        )}
      </main>

      {!chargement && devis && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 p-3 shadow-2xl backdrop-blur-md"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><div><p className="text-xs font-medium text-secondary">Devis n° {devis.numero}</p><p className="font-headline text-lg font-black text-on-surface">{formatMontant(devis.montantHT)} € <span className="text-xs text-secondary">HT</span></p></div>{devisActionnable ? <button type="button" disabled={decisionEnCours} onClick={() => void appliquerDecision('accepte')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-xs font-extrabold uppercase text-white shadow-md"><ThumbsUp className="h-4 w-4" /> Accepter</button> : <span className="text-right text-xs font-bold text-secondary">Réponse enregistrée</span>}</div></div>}
      <Footer compact />
    </div>
  );
}
