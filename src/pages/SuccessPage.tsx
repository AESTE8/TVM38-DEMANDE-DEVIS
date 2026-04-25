import { CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const typeClient = location.state?.typeClient as 'professionnel' | 'particulier' | undefined;
  const isPro = typeClient !== 'particulier';
  const [widgetOpen, setWidgetOpen] = useState(false);

  const handleNewRequest = () => {
    navigate('/formulaire');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-16 text-center">

        {/* Icône confirmation */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Message principal — ton humain (prop. 4) */}
        <h2 className="text-2xl font-bold mb-2">Merci, on s'occupe de tout.</h2>
        <p className="text-muted-foreground mb-8">
          Votre demande a bien été transmise à notre équipe.
        </p>

        {/* Bloc preuve sociale — adapté pro/particulier */}
        <div className="mb-6 p-5 rounded-xl bg-surface-container-highest border border-border text-left">
          {isPro ? (
            <>
              <p className="text-sm font-semibold text-on-surface mb-1">
                350+ professionnels du BTP en Isère nous font confiance.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Le plus dur est derrière vous. Nous laisser un avis, c'est nettement plus simple.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-on-surface mb-1">
                Des centaines de clients nous font confiance en Isère.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Le plus dur est derrière vous. Nous laisser un avis, c'est nettement plus simple.
              </p>
            </>
          )}
        </div>

        {/* Boutons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleNewRequest}>
            Soumettre une nouvelle demande
          </Button>
          <Link
            to="/estimation"
            className="btn-glow inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-red-600 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            ★ Laisser un avis
          </Link>
        </div>

      </main>

      {/* Widget "Pour les curieux·ses" */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {/* Panel */}
        <div
          className={`transition-all duration-300 origin-bottom-right ${
            widgetOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header panel */}
            <div className="bg-[#0f2940] px-4 py-3 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Un mot du créateur 👋</span>
              <button
                onClick={() => setWidgetOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {/* Photo + nom */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/photo_esteban.png"
                  alt="Esteban"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#0f2940]/20 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">Esteban</p>
                  <p className="text-xs text-gray-500">Assistant conducteur de travaux · Licence Pro</p>
                </div>
              </div>

              {/* Message */}
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-sm text-gray-700 leading-relaxed mb-4">
                <p className="mb-2">
                  Cet outil que vous venez d'utiliser, c'est mon projet de fin d'année — développé
                  en conditions réelles pour TVM38.
                </p>
                <p>
                  Si l'expérience vous a semblé simple et utile, un avis Google me permettrait de
                  prouver que ce projet a eu un vrai impact. Ça prend 30 secondes et ça compte
                  énormément pour moi. 🙏
                </p>
              </div>

              {/* CTA */}
              <Link
                to="/estimation"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#0f2940] text-white text-sm font-semibold hover:bg-[#1a3f60] transition-colors"
              >
                ⭐ Laisser un avis
              </Link>
            </div>
          </div>
        </div>

        {/* Bouton flottant */}
        <button
          onClick={() => setWidgetOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0f2940] text-white text-sm font-medium shadow-lg hover:bg-[#1a3f60] transition-all hover:scale-105 active:scale-95"
        >
          <span>Pour les curieux·ses</span>
          <span className="text-base">👀</span>
        </button>
      </div>
    </div>
  );
}
