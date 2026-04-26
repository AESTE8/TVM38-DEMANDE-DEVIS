import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { setSession, setGuestMode, hasAccess, ClientData } from '@/lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WEB3FORMS_KEY = '6b3c4c9e-c46d-4e6c-beaf-06ede9b43b96';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasAccess()) navigate('/formulaire', { replace: true });
  }, []);
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccountRequest, setShowAccountRequest] = useState(false);
  const [accountRequestSent, setAccountRequestSent] = useState(false);
  const [accountForm, setAccountForm] = useState({ nom: '', email: '', telephone: '', entreprise: '' });
  const [accountLoading, setAccountLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant: identifiant.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'ACCOUNT_SUSPENDED') {
          setError('Votre compte est suspendu. Contactez TVM38 au 04 76 XX XX XX ou par email.');
        } else {
          setError('Identifiant ou mot de passe incorrect.');
        }
        return;
      }

      setSession(data.client as ClientData);
      navigate('/formulaire', { replace: true });
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    setGuestMode();
    navigate('/formulaire', { replace: true });
  }

  async function handleAccountRequest(e: React.FormEvent) {
    e.preventDefault();
    setAccountLoading(true);
    try {
      const body = new FormData();
      body.append('access_key', WEB3FORMS_KEY);
      body.append('subject', 'Demande d\'ouverture de compte TVM38');
      body.append('from_name', accountForm.nom);
      body.append('message', `Demande d'ouverture de compte\n\nNom : ${accountForm.nom}\nEmail : ${accountForm.email}\nTéléphone : ${accountForm.telephone}\nEntreprise : ${accountForm.entreprise}`);
      body.append('email', accountForm.email);

      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body });
      if (res.ok) {
        setAccountRequestSent(true);
      } else {
        toast.error('Envoi échoué. Réessayez ou contactez-nous directement.');
      }
    } catch {
      toast.error('Impossible d\'envoyer la demande. Vérifiez votre connexion.');
    } finally {
      setAccountLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-md">

          {/* Titre */}
          <div className="text-center mb-6">
            <img src="/logo-tvm38.png" alt="TVM38" className="h-20 md:h-28 w-32 md:w-48 mx-auto mb-4" />
            <h1 className="text-3xl font-black tracking-tighter text-on-surface uppercase font-headline">
              Votre devis granulats en 3 minutes
            </h1>
          </div>

          {/* Preuve sociale */}
          <div className="flex items-center justify-center gap-6 mb-6 py-3 px-4 bg-primary/5 border border-primary/10 rounded-sm">
            <div className="text-center">
              <p className="text-lg font-black text-primary font-headline leading-none">350+</p>
              <p className="text-[10px] text-secondary font-body mt-0.5 leading-tight">professionnels<br/>du BTP</p>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div className="text-center">
              <p className="text-lg font-black text-primary font-headline leading-none">1937</p>
              <p className="text-[10px] text-secondary font-body mt-0.5 leading-tight">présents dans le<br/>Grésivaudan</p>
            </div>
          </div>

          {/* Carte login */}
          <div className="bg-white border border-border/40 rounded-sm shadow-xl shadow-primary/5 p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Identifiant */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                  Identifiant client
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                  <input
                    type="text"
                    value={identifiant}
                    onChange={e => { setIdentifiant(e.target.value); setError(null); }}
                    placeholder="Ex : TVM-001"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 py-3 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-sm p-3 text-sm text-destructive font-body">
                  {error}
                </div>
              )}

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold py-3.5 px-6 rounded-sm uppercase tracking-tighter text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>

              {/* Lien identifiants oubliés */}
              <div className="text-center">
                <Link
                  to="/identifiants-oublies"
                  className="text-xs text-primary hover:underline font-body"
                >
                  Identifiants oubliés ?
                </Link>
              </div>
            </form>

            {/* Séparateur */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-xs text-secondary/50 font-body">ou</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* Section sans compte */}
            {!showAccountRequest ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGuest}
                  className="w-full border border-secondary/30 text-secondary/70 font-headline font-bold py-2.5 px-6 rounded-sm uppercase tracking-tighter text-xs hover:bg-surface-container active:scale-[0.98] transition-all"
                >
                  Continuer sans compte
                </button>
                <p className="text-center text-[11px] text-secondary/40 font-body -mt-1">
                  Professionnel sans compte · Particuliers
                </p>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAccountRequest(true)}
                    className="text-xs text-primary hover:underline font-body"
                  >
                    Pas encore client ? Demander l'ouverture d'un compte →
                  </button>
                </div>
              </div>
            ) : accountRequestSent ? (
              <div className="text-center py-4 space-y-2">
                <div className="text-2xl">✓</div>
                <p className="text-sm font-bold text-on-surface font-headline">Demande envoyée !</p>
                <p className="text-xs text-secondary font-body">Notre équipe vous contactera dans les meilleurs délais.</p>
                <button
                  type="button"
                  onClick={() => { setShowAccountRequest(false); setAccountRequestSent(false); }}
                  className="text-xs text-primary hover:underline font-body mt-2"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccountRequest} className="space-y-4">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest font-headline">
                  Demande d'ouverture de compte
                </p>
                {[
                  { key: 'nom', label: 'Nom complet', placeholder: 'Jean Dupont', required: true },
                  { key: 'email', label: 'Email', placeholder: 'jean.dupont@entreprise.fr', required: true },
                  { key: 'telephone', label: 'Téléphone', placeholder: '06 12 34 56 78', required: false },
                  { key: 'entreprise', label: 'Entreprise', placeholder: 'Dupont SARL', required: false },
                ].map(({ key, label, placeholder, required }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-secondary font-headline">
                      {label}{required && ' *'}
                    </label>
                    <input
                      type={key === 'email' ? 'email' : 'text'}
                      value={accountForm[key as keyof typeof accountForm]}
                      onChange={e => setAccountForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required={required}
                      className="w-full px-3 py-2.5 border border-border rounded-sm text-sm font-body text-on-surface bg-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={accountLoading}
                  className="w-full bg-industrial-gradient text-on-primary font-headline font-extrabold py-3 px-6 rounded-sm uppercase tracking-tighter text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {accountLoading ? 'Envoi...' : 'Envoyer la demande'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountRequest(false)}
                  className="w-full text-secondary/70 font-body text-xs py-1 hover:text-secondary transition-colors"
                >
                  ← Retour
                </button>
              </form>
            )}
          </div>

          <div className="text-center mt-6 space-y-1">
            <p className="text-xs text-secondary/50 font-body">TVM38 - MIDALI FRERES</p>
            <a href="tel:0476714211" className="text-xs text-primary font-bold font-body hover:underline">
              📞 04 76 71 42 11
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
