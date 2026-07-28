import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  X,
  Star,
  ArrowRight,
  Sparkles,
  MessageSquareHeart,
  FileCheck2,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { isSessionValid } from '@/lib/auth';

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const typeClient = location.state?.typeClient as 'professionnel' | 'particulier' | undefined;
  const isPro = typeClient !== 'particulier';
  const [widgetOpen, setWidgetOpen] = useState(false);

  // Auto-ouverture douce du mot du créateur après 1.2 seconde pour capter l'attention sans bloquer
  useEffect(() => {
    const timer = setTimeout(() => {
      setWidgetOpen(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleNewRequest = () => {
    navigate('/formulaire');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-background to-surface flex flex-col justify-between">
      <Header />

      <main className="w-full max-w-2xl mx-auto px-4 pt-24 md:pt-28 pb-16 flex-1">
        {/* Carte principale de confirmation */}
        <div className="rounded-2xl border border-border/80 bg-white p-6 sm:p-8 shadow-[0_16px_45px_rgba(0,83,161,0.08)] animate-scale-bounce text-center">
          {/* Icône confirmation animée */}
          <div className="flex justify-center mb-5">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="w-11 h-11" strokeWidth={2.2} />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          {/* Titre & Message principal */}
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Demande transmise avec succès !
          </h1>
          <p className="mt-2 text-sm sm:text-base text-secondary max-w-lg mx-auto leading-relaxed">
            Merci ! Notre équipe prépare votre proposition.{' '}
            {isPro
              ? "Un devis détaillé vous sera transmis rapidement par email et dans votre espace."
              : "Un conseiller TVM38 prendra contact avec vous très rapidement."}
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

          {/* Actions secondaires */}
          <div className="mt-6 pt-5 border-t border-border/60 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={handleNewRequest}
              className="min-h-11 border-border text-on-surface font-bold text-xs uppercase tracking-tight hover:bg-surface"
            >
              Soumettre une autre demande
            </Button>
            <Link
              to="/estimation"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-industrial-gradient text-white text-xs font-extrabold uppercase tracking-tight shadow-md hover:opacity-95 transition"
            >
              <Star className="w-4 h-4 fill-white" />
              Laisser un avis
            </Link>
          </div>
        </div>

        {/* SECTION METTANT EN AVANT "UN MOT DU CRÉATEUR" DIRECTEMENT DANS LA PAGE */}
        <div className="mt-8 rounded-2xl border border-primary/25 bg-gradient-to-br from-white via-primary/[0.03] to-primary/[0.08] p-6 sm:p-7 shadow-lg relative overflow-hidden animate-slide-up">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <GraduationCap className="w-32 h-32 text-primary" />
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Photo Esteban avec badge */}
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <img
                src="/photo_esteban.png"
                alt="Esteban - Créateur de l'application TVM38"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white shadow-md"
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
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-500/20">
                  👋 Étudiant BTP
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-secondary">
                Assistant conducteur de travaux · Projet de fin d'études TVM38
              </p>

              <div className="mt-3 rounded-xl bg-white/80 border border-border/60 p-3.5 text-xs leading-relaxed text-secondary text-left backdrop-blur-sm">
                <p className="font-medium text-on-surface">
                  Cet outil que vous venez d'utiliser est mon <strong>projet de diplôme de Licence Pro</strong>, conçu sur le terrain avec TVM38 pour simplifier la vie des chantiers.
                </p>
                <p className="mt-2 text-secondary">
                  Si l'expérience vous a paru rapide et intuitive, <strong>votre avis prend 30 secondes</strong> et m'aide énormément à prouver l'impact concret de ce travail ! 🙏
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/estimation"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-tight shadow-md hover:bg-primary/90 transition motion-hover-lift"
                >
                  <MessageSquareHeart className="w-4 h-4 text-amber-300" />
                  Laisser un avis pour soutenir Esteban
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* WIDGET FLOTTANT "MOT DU CRÉATEUR" (AVEC AUTO-OUVERTURE & EFFET ATTRAPE-REGARD) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {/* Panel Popover */}
        {widgetOpen && (
          <div className="w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-primary/20 overflow-hidden animate-scale-bounce origin-bottom-right">
            {/* Header panel */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-black uppercase tracking-wider">Un mot du créateur</span>
              </div>
              <button
                type="button"
                onClick={() => setWidgetOpen(false)}
                className="grid h-6 w-6 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/photo_esteban.png"
                  alt="Esteban"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-primary/20 shrink-0 shadow-sm"
                />
                <div>
                  <p className="text-sm font-extrabold text-on-surface">Esteban</p>
                  <p className="text-xs text-secondary">Licence Pro BTP · Concepteur de l'app</p>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-3 text-xs text-secondary leading-relaxed mb-3">
                <p>
                  Mon projet de fin d'études consiste à créer cet outil pour TVM38. Votre avis m'aide directement à valider mon diplôme ! 🙏
                </p>
              </div>

              <Link
                to="/estimation"
                onClick={() => setWidgetOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-tight hover:bg-primary/90 transition shadow-md"
              >
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                Laisser un avis (30s)
              </Link>
            </div>
          </div>
        )}

        {/* Bouton pill flottant avec photo + badge d'attention */}
        <button
          type="button"
          onClick={() => setWidgetOpen((v) => !v)}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-primary text-white text-xs font-extrabold uppercase tracking-tight shadow-xl hover:bg-primary/95 transition-all motion-hover-lift"
        >
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/60">
            <img src="/photo_esteban.png" alt="Esteban" className="h-full w-full object-cover" />
          </span>
          <span>Un mot du créateur</span>
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-on-surface shadow-sm">
            👋
          </span>
          {!widgetOpen && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>

      <Footer compact />
    </div>
  );
}

