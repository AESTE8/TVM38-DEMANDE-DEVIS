import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const typeClient = location.state?.typeClient as 'professionnel' | 'particulier' | undefined;
  const isPro = typeClient !== 'particulier';

  const handleNewRequest = () => {
    navigate('/');
    setTimeout(() => {
      document.getElementById('devis-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
    </div>
  );
}
