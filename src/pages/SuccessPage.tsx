import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';

export default function SuccessPage() {
  const navigate = useNavigate();

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
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3">Demande envoyée !</h2>
        <p className="text-muted-foreground mb-2">
          Votre demande de devis a bien été transmise à notre équipe.
        </p>
        <p className="text-muted-foreground mb-8">
          Nous reviendrons vers vous <strong>très prochainement</strong>.
        </p>
        <Button variant="outline" onClick={handleNewRequest}>
          Soumettre une nouvelle demande
        </Button>
      </main>
    </div>
  );
}
