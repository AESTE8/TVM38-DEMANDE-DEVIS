import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, Plus, MapPin, AlertTriangle, Inbox } from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClientBadge from '@/components/ClientBadge';
import StatutBadge from '@/components/portal/StatutBadge';
import { getConnectedClient } from '@/lib/auth';
import {
  Affaire,
  SessionExpiree,
  TYPE_DEMANDE_LABELS,
  fetchAffaires,
  formatDate,
  formatMontant,
  formatTonnage,
} from '@/lib/portal';

/** « 0/31,5 Concassé · 25 t » — le repère le plus parlant pour reconnaître une affaire. */
function resumeLignes(affaire: Affaire): string {
  if (affaire.lignes.length === 0) return 'Aucun matériau';

  const [premiere, ...reste] = affaire.lignes;
  const total = affaire.lignes.reduce((somme, l) => somme + l.quantiteTonnes, 0);
  const suffixe = reste.length > 0 ? ` + ${reste.length} autre${reste.length > 1 ? 's' : ''}` : '';

  return `${premiere.nom}${suffixe} · ${formatTonnage(total)} t`;
}

export default function EspacePage() {
  const navigate = useNavigate();
  const client = getConnectedClient();

  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Mon espace — TVM38';
  }, []);

  useEffect(() => {
    let annule = false;

    fetchAffaires()
      .then((data) => {
        if (!annule) setAffaires(data);
      })
      .catch((err) => {
        if (annule) return;
        if (err instanceof SessionExpiree) {
          navigate('/', { replace: true });
          return;
        }
        setErreur("Impossible de charger vos demandes. Vérifiez votre connexion.");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [navigate]);

  const prenomOuNom = client?.type === 'particulier'
    ? client?.prenom || client?.nom
    : client?.nom;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header>{client && <ClientBadge />}</Header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-24 md:pt-32 pb-12">

        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-on-surface uppercase font-headline">
            Mon espace
          </h1>
          {prenomOuNom && (
            <p className="text-sm text-secondary font-body mt-1">
              {prenomOuNom} · Vos demandes et les devis correspondants
            </p>
          )}
        </div>

        {/* Nouvelle demande — la première valeur du site reste de générer des demandes */}
        <Link
          to="/formulaire"
          className="flex items-center justify-center gap-2 w-full bg-industrial-gradient text-on-primary font-headline font-extrabold py-4 px-6 rounded-sm uppercase tracking-tighter text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all mb-8"
        >
          <Plus className="w-5 h-5" />
          Nouvelle demande de devis
        </Link>

        {/* États de chargement / erreur */}
        {chargement && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <span className="sr-only">Chargement de vos demandes…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-sm bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {!chargement && erreur && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-body">{erreur}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs text-destructive font-bold underline mt-1"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Aucune affaire */}
        {!chargement && !erreur && affaires.length === 0 && (
          <div className="text-center py-12 px-6 border border-dashed border-border rounded-sm">
            <Inbox className="w-10 h-10 text-secondary/30 mx-auto mb-3" />
            <p className="font-headline font-bold text-on-surface">Aucune demande pour le moment</p>
            <p className="text-sm text-secondary font-body mt-1 max-w-sm mx-auto">
              Vos demandes de devis et les réponses de TVM38 apparaîtront ici,
              du plus récent au plus ancien.
            </p>
          </div>
        )}

        {/* Le fil */}
        {!chargement && !erreur && affaires.length > 0 && (
          <ul className="space-y-3">
            {affaires.map((affaire) => (
              <li key={affaire.id}>
                <Link
                  to={`/espace/${encodeURIComponent(affaire.id)}`}
                  className="block bg-card border border-border/60 rounded-sm p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <StatutBadge statut={affaire.statut} />
                    <span className="text-xs text-secondary/70 font-body shrink-0 pt-1">
                      {formatDate(affaire.date)}
                    </span>
                  </div>

                  <p className="font-headline font-bold text-on-surface text-sm leading-snug">
                    {resumeLignes(affaire)}
                  </p>

                  <p className="flex items-center gap-1.5 text-xs text-secondary font-body mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {TYPE_DEMANDE_LABELS[affaire.typeDemande] ?? affaire.typeDemande}
                      {affaire.lieu ? ` — ${affaire.lieu}` : ''}
                    </span>
                  </p>

                  {affaire.montantHT !== null && (
                    <div className="flex items-end justify-between gap-3 mt-3 pt-3 border-t border-border/40">
                      <div className="min-w-0">
                        <p className="text-lg font-black text-on-surface font-headline leading-none">
                          {formatMontant(affaire.montantHT)} € <span className="text-xs font-bold text-secondary">HT</span>
                        </p>
                        {affaire.montantModifie && (
                          <p className="text-[11px] text-amber-700 font-body font-bold mt-1">
                            Montant mis à jour
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs text-secondary font-body">
                        {affaire.numeroDevis && (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {affaire.numeroDevis}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}
