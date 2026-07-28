import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Download,
  Check,
  MapPin,
  Truck,
  Calendar,
} from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClientBadge from '@/components/ClientBadge';
import StatutBadge from '@/components/portal/StatutBadge';
import { getConnectedClient } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  AffaireDetail,
  CRENEAU_LABELS,
  LignePortail,
  SessionExpiree,
  TYPE_DEMANDE_LABELS,
  fetchAffaire,
  formatDate,
  formatMontant,
  formatTonnage,
  ouvrirPdfDevis,
} from '@/lib/portal';

function TableauLignes({ lignes }: { lignes: LignePortail[] }) {
  if (lignes.length === 0) {
    return <p className="text-sm text-secondary font-body">Aucun matériau.</p>;
  }

  return (
    <ul className="divide-y divide-border/40">
      {lignes.map((ligne, i) => (
        <li key={`${ligne.code ?? ligne.nom}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-body text-on-surface truncate">{ligne.nom}</p>
            {ligne.type && (
              <p className="text-[11px] text-secondary/70 font-body uppercase tracking-wider">
                {ligne.type === 'decharge' ? 'Déblai à récupérer' : 'À livrer'}
              </p>
            )}
          </div>
          <p className="text-sm font-bold text-on-surface font-headline shrink-0">
            {formatTonnage(ligne.quantiteTonnes)} t
          </p>
        </li>
      ))}
    </ul>
  );
}

function Info({ icone, label, valeur }: { icone: React.ReactNode; label: string; valeur: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-secondary/60 mt-0.5 shrink-0">{icone}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-secondary/70 font-headline font-bold">{label}</p>
        <p className="text-sm text-on-surface font-body break-words">{valeur}</p>
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

  useEffect(() => {
    document.title = 'Détail de la demande — TVM38';
  }, []);

  useEffect(() => {
    if (!id) return;
    let annule = false;

    fetchAffaire(id)
      .then((data) => {
        if (!annule) setAffaire(data);
      })
      .catch((err) => {
        if (annule) return;
        if (err instanceof SessionExpiree) {
          navigate('/', { replace: true });
          return;
        }
        setErreur("Cette demande est introuvable ou n'est plus accessible.");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [id, navigate]);

  async function handlePdf() {
    if (!affaire?.devisId) return;
    setPdfEnCours(true);
    try {
      await ouvrirPdfDevis(affaire.devisId);
    } catch (err) {
      if (err instanceof SessionExpiree) {
        navigate('/', { replace: true });
        return;
      }
      toast.error("Le PDF n'a pas pu être ouvert. Réessayez dans un instant.");
    } finally {
      setPdfEnCours(false);
    }
  }

  const devis = affaire?.devis ?? null;
  const demande = affaire?.demande ?? null;

  return (
    <div className="min-h-screen bg-surface flex flex-col relative pb-24">
      <Header>{client && <ClientBadge />}</Header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-24 md:pt-32 pb-12">

        <Link
          to="/espace"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:text-primary transition-colors mb-5"
        >
          <ChevronLeft className="w-4 h-4 text-primary" />
          Retour à mon espace
        </Link>

        {chargement && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <span className="sr-only">Chargement du détail…</span>
            <div className="h-32 rounded-xl bg-surface-container animate-pulse" />
            <div className="h-64 rounded-xl bg-surface-container animate-pulse" />
          </div>
        )}

        {!chargement && erreur && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">Une erreur est survenue</p>
              <p className="text-sm text-destructive/80 font-body mt-0.5">{erreur}</p>
            </div>
          </div>
        )}

        {!chargement && affaire && (
          <div className="space-y-5">

            {/* Statut + suivi */}
            <section className="bg-card border border-border/75 rounded-xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-border/50">
                <StatutBadge statut={affaire.statut} />
                {devis?.numero && (
                  <span className="text-xs font-bold text-secondary">
                    Devis n° <strong className="text-on-surface font-black">{devis.numero}</strong>
                  </span>
                )}
              </div>

              <ol className="space-y-0">
                {affaire.timeline.map((etape, i) => (
                  <li key={etape.cle} className="flex gap-3.5">
                    {/* Colonne du fil */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all',
                          etape.atteint
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : 'bg-surface border-border text-secondary/40',
                        )}
                      >
                        {etape.atteint && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </span>
                      {i < affaire.timeline.length - 1 && (
                        <span
                          className={cn(
                            'w-0.5 flex-1 min-h-[28px]',
                            affaire.timeline[i + 1].atteint ? 'bg-primary' : 'bg-border/60',
                          )}
                        />
                      )}
                    </div>

                    <div className={cn('pb-4.5', i === affaire.timeline.length - 1 && 'pb-0')}>
                      <p
                        className={cn(
                          'text-sm font-headline font-bold leading-snug',
                          etape.atteint ? 'text-on-surface' : 'text-secondary/50',
                        )}
                      >
                        {etape.label}
                      </p>
                      {etape.date && etape.atteint && (
                        <p className="text-xs text-secondary/70 font-body mt-0.5">{formatDate(etape.date)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Le devis */}
            {devis && (
              <section className="bg-card border border-border/75 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-surface-container-low px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-secondary font-headline font-bold">
                      Proposition Chiffrée
                    </p>
                    <p className="font-headline font-black text-on-surface tracking-tight text-lg">
                      Devis n° {devis.numero}
                    </p>
                  </div>
                  {devis.pdfDisponible && (
                    <button
                      type="button"
                      onClick={handlePdf}
                      disabled={pdfEnCours}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-600/30 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {devis.montantModifie && (
                    <div className="bg-amber-50/80 border border-amber-300/70 rounded-lg p-3.5 flex gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs font-body text-amber-900 leading-relaxed">
                        <p className="font-bold">
                          Ce devis a été mis à jour par TVM38{devis.updatedAt ? ` le ${formatDate(devis.updatedAt)}` : ''}.
                        </p>
                        <p className="mt-0.5">
                          Le montant ci-dessous fait foi.
                          {devis.montantEnvoye !== null && (
                            <> (L'email du {formatDate(devis.dateEnvoi)} indiquait initialement {formatMontant(devis.montantEnvoye)} € HT)</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <TableauLignes lignes={devis.lignes} />

                  <div className="flex items-end justify-between gap-4 pt-3.5 border-t-2 border-on-surface/10">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-secondary font-headline font-bold">
                        Montant Total HT
                      </p>
                      <p className="text-xs text-secondary/70 font-body">TVA et frais de transport inclus</p>
                    </div>
                    <p className="text-3xl font-black text-on-surface font-headline leading-none">
                      {formatMontant(devis.montantHT)} € <span className="text-sm font-bold text-secondary">HT</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {devis.adresseLivraison && (
                      <Info icone={<MapPin className="w-4 h-4 text-primary" />} label="Lieu de livraison" valeur={devis.adresseLivraison} />
                    )}
                    {devis.datePlanification && (
                      <Info
                        icone={<Calendar className="w-4 h-4 text-primary" />}
                        label="Date planifiée"
                        valeur={`${formatDate(devis.datePlanification)}${devis.creneau ? ` · ${CRENEAU_LABELS[devis.creneau] ?? devis.creneau}` : ''}`}
                      />
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Pas encore de devis */}
            {!devis && affaire.statut !== 'sans_suite' && (
              <section className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                <p className="font-headline font-bold text-on-surface text-base">
                  Votre demande est actuellement en cours d'étude
                </p>
                <p className="text-sm text-secondary font-body mt-1.5 max-w-md mx-auto">
                  L'équipe commerciale TVM38 prépare votre chiffrage. Vous recevrez une notification dès qu'il sera disponible.
                </p>
                <div className="mt-4 flex justify-center">
                  <a
                    href="mailto:tvm38@midali.fr"
                    className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-white px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition"
                  >
                    Question sur ma demande ? Contacter TVM38
                  </a>
                </div>
              </section>
            )}

            {/* Rappel de la demande */}
            {demande && (
              <section className="bg-card border border-border/75 rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDemandeOuverte((v) => !v)}
                  aria-expanded={demandeOuverte}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-container-low transition-colors"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-secondary font-headline font-bold">
                      Détail de la demande initiale
                    </p>
                    <p className="text-sm font-body text-on-surface font-semibold">
                      Soumise le {formatDate(demande.createdAt)}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-secondary shrink-0 transition-transform duration-200',
                      demandeOuverte && 'rotate-180',
                    )}
                  />
                </button>

                {demandeOuverte && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Info
                        icone={<Truck className="w-4 h-4 text-primary" />}
                        label="Type de demande"
                        valeur={TYPE_DEMANDE_LABELS[demande.typeDemande] ?? demande.typeDemande}
                      />
                      {demande.adresseLivraison && (
                        <Info icone={<MapPin className="w-4 h-4 text-primary" />} label="Adresse" valeur={demande.adresseLivraison} />
                      )}
                      {demande.dateSouhaitee && (
                        <Info
                          icone={<Calendar className="w-4 h-4 text-primary" />}
                          label="Date souhaitée"
                          valeur={`${formatDate(demande.dateSouhaitee)}${demande.creneau ? ` · ${CRENEAU_LABELS[demande.creneau] ?? demande.creneau}` : ''}`}
                        />
                      )}
                      {demande.agenceNom && (
                        <Info icone={<MapPin className="w-4 h-4 text-primary" />} label="Agence" valeur={demande.agenceNom} />
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-secondary/70 font-headline font-bold mb-1.5">
                        Matériaux demandés
                      </p>
                      <TableauLignes lignes={demande.lignes} />
                    </div>

                    {demande.notes && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-secondary/70 font-headline font-bold mb-1">
                          Vos précisions
                        </p>
                        <p className="text-sm text-on-surface font-body whitespace-pre-wrap rounded-lg bg-surface-container-low p-3">{demande.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar quand devis prêt */}
      {!chargement && devis && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 border-t border-border/80 p-3 shadow-2xl backdrop-blur-md z-40">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="hidden sm:block">
              <p className="text-xs text-secondary font-medium">Devis n° {devis.numero}</p>
              <p className="text-lg font-black text-on-surface font-headline leading-tight">
                {formatMontant(devis.montantHT)} € <span className="text-xs font-bold text-secondary">HT</span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {devis.pdfDisponible && (
                <button
                  type="button"
                  onClick={handlePdf}
                  disabled={pdfEnCours}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface transition"
                >
                  <Download className="w-4 h-4 text-primary" />
                  PDF
                </button>
              )}
              <a
                href={`mailto:tvm38@midali.fr?subject=Validation Devis ${devis.numero}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-industrial-gradient px-5 py-2.5 font-headline text-xs font-extrabold uppercase tracking-tight text-white shadow-md transition hover:-translate-y-0.5"
              >
                <Check className="w-4 h-4" />
                Valider la commande
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer compact />
    </div>
  );
}

