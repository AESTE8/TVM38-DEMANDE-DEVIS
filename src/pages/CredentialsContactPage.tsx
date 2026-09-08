import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn, formatPhoneInput } from '@/lib/utils';
import { envoyerMessageContact } from '@/lib/contact';

const inputClass = 'min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-on-surface outline-none transition placeholder:text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-container-low disabled:text-secondary';

export default function CredentialsContactPage() {
  const [form, setForm] = useState({ codeClient: '', email: '', nom: '', telephone: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sansEmail, setSansEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  const handleSansEmailToggle = () => {
    setError(null);
    if (!sansEmail) {
      if (form.email) setSavedEmail(form.email);
      setSansEmail(true);
      setForm((value) => ({ ...value, email: '' }));
      return;
    }
    setSansEmail(false);
    setForm((value) => ({ ...value, email: savedEmail }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (sansEmail && !form.telephone) {
      setError('Veuillez renseigner votre numéro de téléphone pour être recontacté.');
      return;
    }

    if (form.telephone && !/^(?:\+33|0033|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(form.telephone)) {
      setError('Le numéro de téléphone français semble incomplet.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messageParts = ["Demande de récupération d'identifiants"];
      messageParts.push(sansEmail ? 'Email de réponse : non renseigné' : `Email de réponse : ${form.email}`);

      await envoyerMessageContact({
        type: 'identifiants',
        nom: form.nom,
        codeClient: form.codeClient,
        email: sansEmail ? '' : form.email,
        telephone: form.telephone,
        message: messageParts.join('\n'),
      });
      setSent(true);
    } catch {
      setError("La demande n'a pas pu être envoyée. Réessayez ou contactez TVM38 directement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <Header showSecondaryAction={false} showPrimaryAction={false} />

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-28">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRound aria-hidden="true" className="h-8 w-8" />
            </div>
            <h1 className="font-headline text-3xl font-black uppercase tracking-tighter text-on-surface">Identifiants oubliés</h1>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Transmettez les éléments qui permettront à l'équipe TVM38 de retrouver votre compte.</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-[0_16px_45px_rgba(0,83,161,0.08)] sm:p-7">
            {sent ? (
              <div className="space-y-4 py-4 text-center" role="status" aria-live="polite">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-headline text-xl font-black text-on-surface">Demande envoyée</h2>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">Votre demande de récupération a été transmise à l'équipe TVM38.</p>
                </div>
                <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold text-primary hover:bg-primary/5">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="recovery-name" className="text-xs font-bold uppercase tracking-wider text-secondary">Nom complet *</label>
                  <input id="recovery-name" type="text" autoComplete="name" value={form.nom} onChange={(event) => setForm((value) => ({ ...value, nom: event.target.value }))} required className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="recovery-code" className="text-xs font-bold uppercase tracking-wider text-secondary">Numéro de compte client *</label>
                  <input id="recovery-code" type="text" autoComplete="username" value={form.codeClient} onChange={(event) => setForm((value) => ({ ...value, codeClient: event.target.value }))} required className={inputClass} />
                  <p className="text-xs text-secondary">Ce numéro figure sur vos devis ou bons de livraison TVM38.</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="text-xs font-bold uppercase tracking-wider text-secondary">Email de contact {!sansEmail && '*'}</label>
                  <input id="recovery-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required={!sansEmail} disabled={sansEmail} className={inputClass} />
                  <button type="button" role="switch" aria-checked={sansEmail} onClick={handleSansEmailToggle} className={cn('flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-xs font-semibold transition', sansEmail ? 'border-primary bg-primary/5 text-primary' : 'border-border text-secondary hover:border-primary/30 hover:text-primary')}>
                    <span aria-hidden="true" className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border-2', sansEmail ? 'border-primary bg-primary text-white' : 'border-secondary/40')}>
                      {sansEmail && <Check className="h-3.5 w-3.5" />}
                    </span>
                    Je n'ai pas d'adresse email
                  </button>
                </div>

                {sansEmail && (
                  <div className="space-y-1.5">
                    <label htmlFor="recovery-phone" className="text-xs font-bold uppercase tracking-wider text-secondary">Numéro de téléphone *</label>
                    <input id="recovery-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.telephone} onChange={(event) => setForm((value) => ({ ...value, telephone: formatPhoneInput(event.target.value) }))} required className={inputClass} />
                  </div>
                )}

                {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm font-semibold text-destructive">{error}</p>}

                <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-extrabold uppercase tracking-tight text-white transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {loading ? 'Envoi en cours' : 'Envoyer la demande'}
                </button>

                <div className="text-center">
                  <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold text-secondary hover:bg-surface-container-low hover:text-primary">
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer compact />
    </div>
  );
}
