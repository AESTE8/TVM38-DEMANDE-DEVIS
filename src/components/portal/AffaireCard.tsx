import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  MapPin,
  MessageCircle,
  Package,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import StatutBadge from '@/components/portal/StatutBadge';
import {
  Affaire,
  StatutAffaire,
  TYPE_DEMANDE_LABELS,
  fetchAffaire,
  formatDate,
  formatMontant,
  formatTonnage,
  ouvrirPdfDevis,
} from '@/lib/portal';

interface AffaireCardProps {
  affaire: Affaire;
}

const STATUT_STEPS: Array<{ key: string; label: string }> = [
  { key: 'envoyee', label: 'Demande' },
  { key: 'en_chiffrage', label: 'Chiffrage' },
  { key: 'devis_recu', label: 'Devis prêt' },
];

function getStepIndex(statut: StatutAffaire): number {
  switch (statut) {
    case 'envoyee':
      return 1;
    case 'en_chiffrage':
      return 2;
    case 'devis_recu':
    case 'modification_demandee':
    case 'acceptee':
    case 'planifiee':
    case 'terminee':
      return 3;
    case 'sans_suite':
      return 0;
    default:
      return 1;
  }
}

function informationsMateriaux(affaire: Affaire) {
  if (affaire.lignes.length === 0) {
    return { titre: 'Matériaux à préciser', quantite: null };
  }

  const [premiere, ...reste] = affaire.lignes;
  const total = affaire.lignes.reduce((somme, ligne) => somme + ligne.quantiteTonnes, 0);
  const suffixe = reste.length > 0
    ? ` + ${reste.length} autre${reste.length > 1 ? 's' : ''}`
    : '';

  return {
    titre: `${premiere.nom}${suffixe}`,
    quantite: `${formatTonnage(total)} t`,
  };
}

export default function AffaireCard({ affaire }: AffaireCardProps) {
  const materiaux = informationsMateriaux(affaire);
  const libelleType = TYPE_DEMANDE_LABELS[affaire.typeDemande] ?? affaire.typeDemande;
  const activeStepIndex = getStepIndex(affaire.statut);

  const [pdfEnCours, setPdfEnCours] = useState(false);

  const handlePdfClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (pdfEnCours) return;
    setPdfEnCours(true);

    try {
      let devId = affaire.devisId;

      if (!devId) {
        if (affaire.id.startsWith('q:')) {
          devId = affaire.id.slice(2);
        } else {
          const detail = await fetchAffaire(affaire.id);
          devId = detail.devisId;
        }
      }

      if (devId) {
        await ouvrirPdfDevis(devId);
      } else {
        toast.error("Le PDF de ce devis n'est pas encore disponible.");
      }
    } catch {
      toast.error("Le PDF n'a pas pu être ouvert. Réessayez dans un instant.");
    } finally {
      setPdfEnCours(false);
    }
  };

  return (
    <Link
      to={`/espace/${encodeURIComponent(affaire.id)}`}
      aria-label={`Consulter ${affaire.numeroDevis ? `le devis ${affaire.numeroDevis}` : 'la demande'} du ${formatDate(affaire.date)}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-[0_8px_30px_rgba(0,83,161,0.06)] motion-hover-lift hover:border-primary/35 hover:shadow-[0_14px_38px_rgba(0,83,161,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5 bg-primary opacity-80 transition-opacity group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatutBadge statut={affaire.statut} />
          {affaire.messagesNonLus > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-1 text-[10px] font-black text-white">
              <MessageCircle aria-hidden="true" className="h-3 w-3" />
              {affaire.messagesNonLus} nouveau{affaire.messagesNonLus > 1 ? 'x' : ''}
            </span>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 pt-1 text-xs font-medium text-secondary/80">
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-primary/70" />
          {formatDate(affaire.date)}
        </span>
      </div>

      {/* Mini Timeline à 3 étapes : Demande, Chiffrage, Devis prêt */}
      {affaire.statut !== 'sans_suite' && (
        <div className="mt-4 rounded-lg bg-surface-container-low/60 p-2.5">
          <div className="flex items-center gap-1.5">
            {STATUT_STEPS.map((step, idx) => {
              const stepNum = idx + 1;
              const isCompleted = activeStepIndex >= stepNum;
              const isCurrent = activeStepIndex === stepNum && activeStepIndex < 3;

              return (
                <div key={step.key} className="flex flex-1 flex-col gap-1">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-amber-500'
                        : 'bg-border/60'
                    }`}
                  />
                  <span
                    className={`truncate text-[10px] font-bold ${
                      isCompleted
                        ? 'text-emerald-700'
                        : isCurrent
                        ? 'text-amber-800'
                        : 'text-secondary/50'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
            <Package aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-headline text-base font-extrabold leading-snug text-on-surface group-hover:text-primary transition-colors">
              {affaire.nomChantier || materiaux.titre}
            </h2>
            {affaire.nomChantier && (
              <p className="mt-0.5 truncate text-xs font-semibold text-secondary">{materiaux.titre}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-secondary">
              <span className="rounded bg-surface-container px-1.5 py-0.5 font-bold text-on-surface-variant">
                {libelleType}
              </span>
              {materiaux.quantite && (
                <>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-secondary/40" />
                  <span className="font-bold text-on-surface">{materiaux.quantite}</span>
                </>
              )}
              {affaire.referenceClient && (
                <span className="inline-flex items-center gap-1 rounded bg-primary/8 px-1.5 py-0.5 font-bold text-primary">
                  <Tag aria-hidden="true" className="h-3 w-3" />
                  Réf. {affaire.referenceClient}
                </span>
              )}
            </div>
          </div>
        </div>

        {affaire.lieu && (
          <p className="mt-3.5 flex items-start gap-2 text-xs leading-relaxed text-secondary">
            <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="line-clamp-2">{affaire.lieu}</span>
          </p>
        )}

        <div className="mt-4 border-t border-border/55 pt-3.5">
          {affaire.montantHT !== null ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary/75">
                  Montant estimé
                </p>
                <p className="mt-0.5 whitespace-nowrap font-headline text-2xl font-black tracking-tight text-on-surface">
                  {formatMontant(affaire.montantHT)}&nbsp;€
                  <span className="ml-1 text-xs font-bold tracking-normal text-secondary">HT</span>
                </p>
                {affaire.montantModifie && (
                  <p className="mt-0.5 text-xs font-semibold text-amber-700">
                    Montant actualisé par TVM38
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end sm:text-right">
                {affaire.numeroDevis && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary max-sm:justify-center">
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                    {affaire.numeroDevis}
                  </span>
                )}
                {affaire.pdfDisponible && (
                  <button
                    type="button"
                    onClick={handlePdfClick}
                    disabled={pdfEnCours}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 uppercase tracking-tight"
                    title="Télécharger le devis au format PDF"
                  >
                    <Download aria-hidden="true" className={`h-4 w-4 ${pdfEnCours ? 'animate-spin' : ''}`} />
                    <span>{pdfEnCours ? 'Téléchargement...' : 'Télécharger Devis (PDF)'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                <span className="w-2 h-2 shrink-0 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Chiffrage en cours (réponse sous 24-48h)</span>
              </p>
              <span className="shrink-0 text-xs font-extrabold text-primary group-hover:underline max-sm:self-end">Suivre le dossier →</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs font-extrabold text-primary">
        Consulter le détail
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
        />
      </div>
    </Link>
  );
}

