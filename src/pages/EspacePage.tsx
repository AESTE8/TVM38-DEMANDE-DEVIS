import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Files,
  Inbox,
  Mail,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClientBadge from '@/components/ClientBadge';
import AffaireCard from '@/components/portal/AffaireCard';
import { getConnectedClient } from '@/lib/auth';
import {
  Affaire,
  GroupeAffaire,
  SessionExpiree,
  TYPE_DEMANDE_LABELS,
  estDansGroupe,
  fetchAffaires,
} from '@/lib/portal';

gsap.registerPlugin(useGSAP);

type FiltreAffaires = 'toutes' | GroupeAffaire;

const FILTRES: Array<{ cle: FiltreAffaires; label: string }> = [
  { cle: 'toutes', label: 'Toutes' },
  { cle: 'en_cours', label: 'En cours' },
  { cle: 'devis_recu', label: 'Devis reçu' },
  { cle: 'historique', label: 'Historique' },
];

function normaliserRecherche(valeur: string): string {
  return valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export default function EspacePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const client = getConnectedClient();

  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<FiltreAffaires>('toutes');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    document.title = 'Mon espace — TVM38';
  }, []);

  useGSAP(() => {
    if (chargement) return;

    const media = gsap.matchMedia();

    media.add(
      {
        animationAutorisee: '(prefers-reduced-motion: no-preference)',
        animationReduite: '(prefers-reduced-motion: reduce)',
      },
      (contexte) => {
        if (contexte.conditions?.animationReduite) return;
        const racine = pageRef.current;
        if (!racine) return;

        const introduction = racine.querySelectorAll('[data-espace-intro]');
        const indicateurs = racine.querySelectorAll('[data-espace-stat]');
        const contenu = racine.querySelectorAll('[data-espace-content]');

        const timeline = gsap.timeline({
          defaults: {
            duration: 0.36,
            ease: 'power2.out',
            clearProps: 'transform,opacity,visibility',
          },
        });

        timeline
          .from(introduction, {
            autoAlpha: 0,
            y: 16,
            stagger: 0.045,
          });

        if (indicateurs.length > 0) {
          timeline.from(indicateurs, {
            autoAlpha: 0,
            y: 12,
            scale: 0.985,
            stagger: 0.05,
            duration: 0.3,
          }, '-=0.2');
        }

        if (contenu.length > 0) {
          timeline.from(contenu, {
            autoAlpha: 0,
            y: 18,
            duration: 0.36,
          }, indicateurs.length > 0 ? '-=0.16' : '-=0.2');
        }
      },
      pageRef,
    );

    return () => media.revert();
  }, {
    scope: pageRef,
    dependencies: [chargement, erreur],
    revertOnUpdate: true,
  });

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

  const statistiques = useMemo(() => ({
    total: affaires.length,
    enCours: affaires.filter((affaire) => estDansGroupe(affaire.statut, 'en_cours')).length,
    devis: affaires.filter((affaire) => estDansGroupe(affaire.statut, 'devis_recu')).length,
  }), [affaires]);

  const affairesFiltrees = useMemo(() => {
    const terme = normaliserRecherche(recherche);

    return affaires.filter((affaire) => {
      const correspondFiltre =
        filtre === 'toutes' || estDansGroupe(affaire.statut, filtre);

      if (!correspondFiltre) return false;
      if (!terme) return true;

      const contenu = [
        affaire.numeroDevis,
        affaire.lieu,
        TYPE_DEMANDE_LABELS[affaire.typeDemande],
        ...affaire.lignes.flatMap((ligne) => [ligne.nom, ligne.code]),
      ]
        .filter(Boolean)
        .join(' ');

      return normaliserRecherche(contenu).includes(terme);
    });
  }, [affaires, filtre, recherche]);

  return (
    <div ref={pageRef} className="flex min-h-screen flex-col bg-surface">
      <Header>{client && <ClientBadge />}</Header>

      <main className="w-full flex-1 pb-16 pt-20 md:pt-24">
        <section className="border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-surface to-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-11 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p data-espace-intro className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Espace client
                </p>
                <h1 data-espace-intro className="mt-2 font-headline text-3xl font-black tracking-tight text-on-surface sm:text-4xl">
                  {prenomOuNom ? `Bonjour, ${prenomOuNom}` : 'Bonjour'}
                </h1>
                <p data-espace-intro className="mt-2 max-w-xl text-sm leading-relaxed text-secondary sm:text-base">
                  Retrouvez vos demandes, suivez leur avancement et consultez les devis transmis par TVM38.
                </p>
              </div>

              <Link
                to="/formulaire"
                data-espace-intro
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-industrial-gradient px-5 py-3 font-headline text-sm font-extrabold uppercase tracking-tight text-on-primary shadow-lg shadow-destructive/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 active:translate-y-0 md:w-auto motion-reduce:transform-none"
              >
                <Plus aria-hidden="true" className="h-5 w-5" />
                Nouvelle demande
              </Link>
            </div>

            {!chargement && !erreur && affaires.length > 0 && (
              <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: 'Dossiers suivis', valeur: statistiques.total, icone: Files },
                  { label: 'En cours', valeur: statistiques.enCours, icone: Clock3 },
                  { label: 'Devis reçus', valeur: statistiques.devis, icone: FileCheck2 },
                ].map(({ label, valeur, icone: Icone }) => (
                  <div
                    key={label}
                    data-espace-stat
                    className="flex min-w-0 flex-col items-start gap-2 rounded-xl border border-border/75 bg-white/85 px-3 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary sm:h-10 sm:w-10">
                      <Icone aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-headline text-xl font-black leading-none text-on-surface">{valeur}</p>
                      <p className="mt-1 text-[11px] font-medium leading-tight text-secondary sm:text-xs">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">

        {/* États de chargement / erreur */}
        {chargement && (
          <div className="grid gap-4 lg:grid-cols-2" aria-live="polite" aria-busy="true">
            <span className="sr-only">Chargement de vos demandes…</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-border/50 bg-white/70" />
            ))}
          </div>
        )}

        {!chargement && erreur && (
          <div data-espace-content role="alert" className="flex gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-destructive/10">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 text-destructive" />
            </span>
            <div>
              <p className="font-headline font-bold text-on-surface">Chargement impossible</p>
              <p className="mt-1 text-sm text-secondary">{erreur}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-white transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Aucune affaire */}
        {!chargement && !erreur && affaires.length === 0 && (
          <div data-espace-content className="overflow-hidden rounded-2xl border border-border/75 bg-card shadow-[0_12px_40px_rgba(0,83,161,0.07)]">
            <div className="px-5 py-10 text-center sm:px-10 sm:py-12">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/8 text-primary">
                <Inbox aria-hidden="true" className="h-8 w-8" />
              </span>
              <h2 className="mt-5 font-headline text-2xl font-black text-on-surface">
                Votre espace est prêt
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-secondary sm:text-base">
                Vous n’avez pas encore de dossier à suivre. Décrivez votre besoin et l’équipe TVM38
                vous répondra avec un devis adapté.
              </p>

              <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                {[
                  { icone: Send, titre: '1. Votre demande', texte: 'Indiquez les matériaux et le chantier.' },
                  { icone: Calculator, titre: '2. Notre chiffrage', texte: 'La carrière prépare votre proposition.' },
                  { icone: CheckCircle2, titre: '3. Votre suivi', texte: 'Consultez le devis et son évolution ici.' },
                ].map(({ icone: Icone, titre, texte }) => (
                  <div key={titre} className="rounded-xl bg-surface-container-low/70 p-4">
                    <Icone aria-hidden="true" className="h-5 w-5 text-primary" />
                    <p className="mt-3 font-headline text-sm font-extrabold text-on-surface">{titre}</p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">{texte}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/formulaire"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-industrial-gradient px-5 py-3 font-headline text-sm font-extrabold uppercase tracking-tight text-white shadow-lg shadow-destructive/15 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 sm:w-auto motion-reduce:transform-none"
                >
                  Créer ma première demande
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:tvm38@midali.fr"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-bold text-on-surface transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
                >
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  Contacter TVM38
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Le fil */}
        {!chargement && !erreur && affaires.length > 0 && (
          <div data-espace-content>
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Historique</p>
                  <h2 className="mt-1 font-headline text-2xl font-black text-on-surface">Vos dossiers</h2>
                </div>
                <p className="text-sm text-secondary">
                  {affairesFiltrees.length} résultat{affairesFiltrees.length > 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1 lg:max-w-md">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                  />
                  <label htmlFor="recherche-affaires" className="sr-only">Rechercher dans mes dossiers</label>
                  <input
                    id="recherche-affaires"
                    type="search"
                    value={recherche}
                    onChange={(event) => setRecherche(event.target.value)}
                    placeholder="N° de devis, matériau ou adresse…"
                    className="min-h-11 w-full rounded-lg border border-border bg-surface/60 py-2.5 pl-10 pr-10 text-sm text-on-surface outline-none transition placeholder:text-secondary/65 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  {recherche && (
                    <button
                      type="button"
                      onClick={() => setRecherche('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-secondary transition hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface-container-low/70 p-1" aria-label="Filtrer les dossiers">
                  {FILTRES.map((item) => (
                    <button
                      key={item.cle}
                      type="button"
                      onClick={() => setFiltre(item.cle)}
                      aria-pressed={filtre === item.cle}
                      className={`min-h-10 shrink-0 rounded-md px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        filtre === item.cle
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-secondary hover:bg-white/70 hover:text-on-surface'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {affairesFiltrees.length > 0 ? (
              <ul className="grid gap-4 lg:grid-cols-2">
                {affairesFiltrees.map((affaire) => (
                  <li key={affaire.id}>
                    <AffaireCard affaire={affaire} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-white/60 px-6 py-12 text-center">
                <Search aria-hidden="true" className="mx-auto h-8 w-8 text-secondary/45" />
                <h3 className="mt-4 font-headline text-lg font-extrabold text-on-surface">Aucun dossier trouvé</h3>
                <p className="mt-1 text-sm text-secondary">Modifiez votre recherche ou affichez tous les dossiers.</p>
                <button
                  type="button"
                  onClick={() => {
                    setRecherche('');
                    setFiltre('toutes');
                  }}
                  className="mt-4 min-h-11 rounded-lg border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      <Footer compact />
    </div>
  );
}
