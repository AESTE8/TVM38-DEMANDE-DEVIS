import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
  FileCheck2,
  GraduationCap,
  Plus,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { isSessionValid } from '@/lib/auth';

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const typeClient = location.state?.typeClient as 'professionnel' | 'particulier' | undefined;
  const isPro = typeClient !== 'particulier';

  const handleNewRequest = () => {
    navigate('/formulaire');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-between bg-gradient-to-b from-surface via-background to-surface">
      <Header />

      <main className="w-full max-w-2xl mx-auto px-4 pt-24 md:pt-28 pb-16 flex-1">
        {/* Carte principale de confirmation */}
        <div className="rounded-xl border border-border/80 bg-white p-6 text-center shadow-[0_16px_45px_rgba(0,83,161,0.08)] sm:p-8">
          {/* Icône confirmation animée */}
          <div className="flex justify-center mb-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="w-11 h-11" strokeWidth={2.2} />
            </div>
          </div>

          {/* Titre & Message principal */}
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Demande transmise avec succès !
          </h1>
          <p className="mt-2 text-sm sm:text-base text-secondary max-w-lg mx-auto leading-relaxed">
            Votre demande a bien été transmise à TVM38.{' '}
            {isPro
              ? "Le devis sera disponible par email et dans votre espace lorsqu'il aura été établi."
              : "TVM38 dispose maintenant des informations transmises dans votre demande."}
          </p>

          {/* Suivi de la demande si connecté */}
          {isSessionValid() && (
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileCheck2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Suivi en direct</p>
                  <p className="text-sm font-semibold text-on-surface">Retrouvez ce dossier sur votre Espace Client</p>
                </div>
              </div>
              <Link
                to="/espace"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white text-xs font-extrabold uppercase tracking-tight shadow-md hover:bg-primary/90 transition motion-smooth shrink-0"
              >
                Mon espace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Action secondaire : Nouvelle demande */}
          <div className="mt-6 pt-5 border-t border-border/60 flex justify-center">
            <button
              type="button"
              onClick={handleNewRequest}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-tight text-on-surface transition hover:bg-surface hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            >
              <Plus className="w-4 h-4 text-primary" />
              Soumettre une autre demande
            </button>
          </div>
        </div>

        {/* CARTE UNIQUE ET ÉLÉGANTE : "UN MOT DU CRÉATEUR" */}
        <aside className="relative mt-8 overflow-hidden rounded-xl border border-primary/20 bg-white p-5 shadow-sm sm:p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <GraduationCap className="w-32 h-32 text-primary" />
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Photo Esteban avec badge */}
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <img
                src="/photo_esteban.png"
                alt="Esteban - Concepteur TVM38"
                className="h-20 w-20 rounded-xl border-2 border-white object-cover shadow-md sm:h-24 sm:w-24"
              />
              <span className="absolute -bottom-2 -right-2 bg-primary text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Licence Pro
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="font-headline text-lg font-black text-on-surface">
                  Un mot du créateur (Esteban)
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/5 px-2 py-0.5 text-xs font-bold text-primary">
                  <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" />
                  Étudiant BTP
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-secondary">
                Assistant conducteur de travaux<br className="sm:hidden" /> Projet de fin d'études TVM38
              </p>

              <div className="mt-3 rounded-xl bg-white/80 border border-border/60 p-3.5 text-xs leading-relaxed text-secondary text-left backdrop-blur-sm">
                <p className="font-medium text-on-surface">
                  Cet outil que vous venez d'utiliser est mon <strong>projet de diplôme de Licence Pro</strong>, conçu sur le terrain avec TVM38 pour simplifier la vie des chantiers.
                </p>
                <p className="mt-2 text-secondary">
                  Votre avis permet d'évaluer l'utilité et la clarté de cet outil dans un usage réel.
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/estimation"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-extrabold uppercase tracking-tight text-white transition hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
                >
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                  Partager mon avis
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <Footer compact />
    </div>
  );
}

