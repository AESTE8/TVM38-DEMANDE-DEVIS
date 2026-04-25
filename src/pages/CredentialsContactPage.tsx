import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import Header from '@/components/layout/Header';

const WEB3FORMS_KEY = '6b3c4c9e-c46d-4e6c-beaf-06ede9b43b96';

export default function CredentialsContactPage() {
  const [form, setForm] = useState({ codeClient: '', email: '', nom: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('access_key', WEB3FORMS_KEY);
      body.append('subject', 'Récupération identifiants TVM38 — ' + form.codeClient);
      body.append('from_name', form.nom);
      body.append('email', form.email);
      body.append('message', `Demande de récupération d'identifiants\n\nNom : ${form.nom}\nCode client : ${form.codeClient}\nEmail de réponse : ${form.email}`);

      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Envoi échoué. Veuillez réessayer ou contacter TVM38 directement.');
      }
    } catch {
      setError('Impossible d\'envoyer le formulaire. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-sm mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface uppercase font-headline">
              Identifiants oubliés
            </h1>
            <p className="text-sm text-secondary mt-1 font-body">
              Renseignez votre numéro de compte client et notre équipe vous recontactera.
            </p>
          </div>

          <div className="bg-white border border-border/40 rounded-sm shadow-xl shadow-primary/5 p-8">
            {sent ? (
              <div className="text-center py-6 space-y-3">
                <div className="text-4xl">✓</div>
                <p className="text-lg font-black uppercase tracking-tighter text-on-surface font-headline">
                  Demande envoyée !
                </p>
                <p className="text-sm text-secondary font-body">
                  Notre équipe vous recontactera à l'adresse <strong>{form.email}</strong> dans les meilleurs délais.
                </p>
                <Link
                  to="/"
                  className="inline-block mt-4 text-sm text-primary hover:underline font-body"
                >
                  ← Retour à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Jean Dupont"
                    required
                    className="w-full px-3 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                    Numéro de compte client *
                  </label>
                  <input
                    type="text"
                    value={form.codeClient}
                    onChange={e => setForm(f => ({ ...f, codeClient: e.target.value }))}
                    placeholder="Ex : TVM-001"
                    required
                    className="w-full px-3 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-secondary/60 font-body">
                    Ce numéro figure sur vos devis ou bons de livraison TVM38.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                    Email de contact *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean.dupont@entreprise.fr"
                    required
                    className="w-full px-3 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-3 text-sm text-destructive font-body">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold py-3.5 px-6 rounded-sm uppercase tracking-tighter text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {loading ? 'Envoi...' : 'Envoyer la demande'}
                </button>

                <div className="text-center">
                  <Link to="/" className="text-xs text-secondary/70 hover:text-secondary font-body">
                    ← Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
