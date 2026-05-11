import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn, formatPhoneInput } from '@/lib/utils';

const WEB3FORMS_KEY = '6b3c4c9e-c46d-4e6c-beaf-06ede9b43b96';

export default function CredentialsContactPage() {
  const [form, setForm] = useState({ codeClient: '', email: '', nom: '', telephone: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sansEmail, setSansEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  const handleSansEmailToggle = () => {
    if (!sansEmail) {
      // Sauvegarder l'email actuel avant de désactiver
      if (form.email && form.email !== 'Contact sans adresse email') {
        setSavedEmail(form.email);
      }
      setSansEmail(true);
      setForm(f => ({ ...f, email: 'Contact sans adresse email' }));
    } else {
      setSansEmail(false);
      setForm(f => ({ ...f, email: savedEmail || '' }));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation téléphone si sans email
    if (sansEmail && !form.telephone) {
      setError('Veuillez renseigner votre numéro de téléphone pour être recontacté.');
      return;
    }

    // Validation téléphone format français
    if (form.telephone && !/^(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}$/.test(form.telephone)) {
      setError('Numéro de téléphone français invalide (ex : 06 12 34 56 78).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('access_key', WEB3FORMS_KEY);
      body.append('subject', 'Récupération identifiants TVM38 — ' + form.codeClient);
      body.append('from_name', form.nom);
      body.append('email', sansEmail ? 'tvm38@midali.fr' : form.email);
      const messageParts = [`Demande de récupération d'identifiants\n\nNom : ${form.nom}`, `Code client : ${form.codeClient}`];
      if (sansEmail) {
        messageParts.push(`Téléphone : ${form.telephone}`);
        messageParts.push(`Email de réponse : non renseigné (contact par téléphone)`);
      } else {
        messageParts.push(`Email de réponse : ${form.email}`);
        if (form.telephone) {
          messageParts.push(`Téléphone : ${form.telephone}`);
        }
      }
      body.append('message', messageParts.join('\n'));

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

          <div className="bg-surface-container-lowest border border-border/40 rounded-sm shadow-xl shadow-primary/5 p-8">
            {sent ? (
              <div className="text-center py-6 space-y-3">
                <div className="text-4xl">✓</div>
                <p className="text-lg font-black uppercase tracking-tighter text-on-surface font-headline">
                  Demande envoyée !
                </p>
                <p className="text-sm text-secondary font-body">
                  {sansEmail
                    ? `Notre équipe vous recontactera par téléphone au <strong>${form.telephone}</strong> dans les meilleurs délais.`
                    : `Notre équipe vous recontactera à l'adresse <strong>${form.email}</strong> dans les meilleurs délais.`
                  }
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
                    placeholder="CTVM01. Identifier un client"
                    required
                    className="w-full px-3 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-secondary/60 font-body">
                    Ce numéro figure sur vos devis ou bons de livraison TVM38.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                    Email de contact {!sansEmail && '*'}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean.dupont@entreprise.fr"
                    required={!sansEmail}
                    disabled={sansEmail}
                    className={cn(
                      "w-full px-3 py-3 border border-border rounded-sm text-sm font-body text-on-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors",
                      sansEmail && "bg-surface-container-lowest opacity-60"
                    )}
                  />

                  {/* Bouton pour continuer sans email */}
                  <button
                    type="button"
                    onClick={handleSansEmailToggle}
                    className={cn(
                      "w-full text-left text-xs font-medium transition-all rounded-lg px-3 py-2.5 flex items-center gap-2 border mt-2",
                      sansEmail
                        ? "bg-primary/5 border-primary text-primary"
                        : "bg-transparent border-border hover:border-primary/30 text-secondary hover:text-primary"
                    )}
                  >
                    {sansEmail ? (
                      <>
                        <span className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center text-white text-xs">✓</span>
                        <span>Contact sans adresse email</span>
                      </>
                    ) : (
                      <>
                        <span className="w-5 h-5 rounded-full border-2 border-secondary/40"></span>
                        <span>Pas d'adresse email ? Continuer</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Téléphone affiché uniquement si sans email */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    sansEmail ? "max-h-32 opacity-100 mt-5" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                      Numéro de téléphone *
                    </label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: formatPhoneInput(e.target.value) }))}
                      placeholder="06 12 34 56 78"
                      required
                      className="w-full px-3 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
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
