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
    <div className="min-h-screen bg-surface flex flex-col">
      <Header>{client && <ClientBadge />}</Header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-24 md:pt-32 pb-12">

        <Link
          to="/espace"
          className="inline-flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Mon espace
        </Link>

        {chargement && (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <span className="sr-only">Chargement du détail…</span>
            <div className="h-32 rounded-sm bg-surface-container animate-pulse" />
            <div className="h-64 rounded-sm bg-surface-container animate-pulse" />
          </div>
        )}

        {!chargement && erreur && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-body">{erreur}</p>
          </div>
        )}

        {!chargement && affaire && (
          <div className="space-y-4">

            {/* Statut + suivi */}
            <section className="bg-card border border-border/60 rounded-sm p-5 shadow-sm">
              <StatutBadge statut={affaire.statut} className="mb-4" />

              <ol className="space-y-0">
                {affaire.timeline.map((etape, i) => (
                  <li key={etape.cle} className="flex gap-3">
                    {/* Colonne du fil */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors',
                          etape.atteint
                            ? 'bg-primary border-primary text-on-primary'
                            : 'bg-surface border-border',
                        )}
                      >
                        {etape.atteint && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                      {i < affaire.timeline.length - 1 && (
                        <span
                          className={cn(
                            'w-0.5 flex-1 min-h-[24px]',
                            affaire.timeline[i + 1].atteint ? 'bg-primary' : 'bg-border',
                          )}
                        />
                      )}
                    </div>

                    <div className={cn('pb-4', i === affaire.timeline.length - 1 && 'pb-0')}>
                      <p
                        className={cn(
                          'text-sm font-headline font-bold leading-5',
                          etape.atteint ? 'text-on-surface' : 'text-secondary/50',
                        )}
                      >
                        {etape.label}
                      </p>
                      {etape.date && etape.atteint && (
                        <p className="text-xs text-secondary/70 font-body">{formatDate(etape.date)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Le devis */}
            {devis && (
              <section className="bg-card border border-border/60 rounded-sm shadow-sm overflow-hidden">
                <div className="bg-surface-container-low px-5 py-3 border-b border-border/40">
                  <p className="text-[11px] uppercase tracking-widest text-secondary font-headline font-bold">
                    Votre devis
                  </p>
                  <p className="font-headline font-black text-on-surface tracking-tight">
                    n° {devis.numero}
                  </p>
                </div>

                <div className="p-5 space-y-4">

                  {/*
                    Le point de vigilance de toute la fonctionnalité : le client a
                    un email avec un montant, le site affiche la dernière version
                    enregistrée par la carrière. Quand les deux diffèrent, on le
                    dit franchement plutôt que de laisser le client face à deux
                    chiffres contradictoires.
                  */}
                  {devis.montantModifie && (
                    <div className="bg-amber-50 border border-amber-300/60 rounded-sm p-3 flex gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs font-body text-amber-900 leading-relaxed">
                        <p className="font-bold">
                          Ce devis a été mis à jour{devis.updatedAt ? ` le ${formatDate(devis.updatedAt)}` : ''}.
                        </p>
                        <p className="mt-0.5">
                          Le montant ci-dessous fait foi
                          {devis.montantEnvoye !== null && (
                            <> — l'email du {formatDate(devis.dateEnvoi)} indiquait {formatMontant(devis.montantEnvoye)} € HT</>
                          )}
                          .
                        </p>
                      </div>
                    </div>
                  )}

                  <TableauLignes lignes={devis.lignes} />

                  <div className="flex items-end justify-between gap-4 pt-3 border-t-2 border-on-surface/10">
                    <p className="text-xs uppercase tracking-widest text-secondary font-headline font-bold pb-1">
                      Total HT
                    </p>
                    <p className="text-2xl font-black text-on-surface font-headline leading-none">
                      {formatMontant(devis.montantHT)} €
                    </p>
                  </div>

                  <p className="text-[11px] text-secondary/70 font-body">
                    Le détail du calcul (transport, remises éventuelles) figure sur le PDF du devis.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {devis.adresseLivraison && (
                      <Info icone={<MapPin className="w-4 h-4" />} label="Livraison" valeur={devis.adresseLivraison} />
                    )}
                    {devis.datePlanification && (
                      <Info
                        icone={<Calendar className="w-4 h-4" />}
                        label="Planifiée le"
                        valeur={`${formatDate(devis.datePlanification)}${devis.creneau ? ` · ${CRENEAU_LABELS[devis.creneau] ?? devis.creneau}` : ''}`}
                      />
                    )}
                  </div>

                  {devis.pdfDisponible ? (
                    <button
                      type="button"
                      onClick={handlePdf}
                      disabled={pdfEnCours}
                      className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary font-headline font-extrabold py-3 px-6 rounded-sm uppercase tracking-tighter text-sm hover:bg-primary/5 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" />
                      {pdfEnCours ? 'Ouverture…' : 'Télécharger le devis (PDF)'}
                    </button>
                  ) : (
                    <p className="text-xs text-secondary/70 font-body text-center">
                      Le PDF de ce devis n'est pas encore disponible en ligne. Il vous a été envoyé par email.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Pas encore de devis */}
            {!devis && affaire.statut !== 'sans_suite' && (
              <section className="bg-tertiary/5 border border-tertiary/20 rounded-sm p-5 text-center">
                <p className="font-headline font-bold text-on-surface text-sm">
                  Votre demande est entre les mains de notre équipe
                </p>
                <p className="text-sm text-secondary font-body mt-1">
                  Le devis apparaîtra ici dès qu'il vous aura été transmis. Vous le recevrez
                  également par email.
                </p>
              </section>
            )}

            {/* Rappel de la demande */}
            {demande && (
              <section className="bg-card border border-border/60 rounded-sm shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDemandeOuverte((v) => !v)}
                  aria-expanded={demandeOuverte}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-container-low transition-colors"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-secondary font-headline font-bold">
                      Votre demande
                    </p>
                    <p className="text-sm font-body text-on-surface">
                      Envoyée le {formatDate(demande.createdAt)}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-secondary shrink-0 transition-transform',
                      demandeOuverte && 'rotate-180',
                    )}
                  />
                </button>

                {demandeOuverte && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Info
                        icone={<Truck className="w-4 h-4" />}
                        label="Type de demande"
                        valeur={TYPE_DEMANDE_LABELS[demande.typeDemande] ?? demande.typeDemande}
                      />
                      {demande.adresseLivraison && (
                        <Info icone={<MapPin className="w-4 h-4" />} label="Adresse" valeur={demande.adresseLivraison} />
                      )}
                      {demande.dateSouhaitee && (
                        <Info
                          icone={<Calendar className="w-4 h-4" />}
                          label="Date souhaitée"
                          valeur={`${formatDate(demande.dateSouhaitee)}${demande.creneau ? ` · ${CRENEAU_LABELS[demande.creneau] ?? demande.creneau}` : ''}`}
                        />
                      )}
                      {demande.agenceNom && (
                        <Info icone={<MapPin className="w-4 h-4" />} label="Agence" valeur={demande.agenceNom} />
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-secondary/70 font-headline font-bold mb-1">
                        Matériaux demandés
                      </p>
                      <TableauLignes lignes={demande.lignes} />
                    </div>

                    {demande.notes && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-secondary/70 font-headline font-bold mb-1">
                          Vos précisions
                        </p>
                        <p className="text-sm text-on-surface font-body whitespace-pre-wrap">{demande.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
