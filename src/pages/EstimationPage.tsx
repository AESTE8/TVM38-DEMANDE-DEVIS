import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, Loader2, Mail, Phone, Star, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { formatPhoneInput } from '@/lib/utils';
import { envoyerMessageContact } from '@/lib/contact';

const RATING_LABELS: Record<number, string> = {
  1: 'Très insatisfait',
  2: 'Insatisfait',
  3: 'Neutre',
  4: 'Satisfait',
  5: 'Très satisfait',
};

const GOOGLE_URL = 'https://g.page/r/CcJfc4onmZFmEAE/review';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/65 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="estimation-modal-title" className="relative w-full max-w-lg rounded-xl border border-white/30 bg-card p-6 shadow-[0_24px_80px_rgba(0,28,54,0.32)] sm:p-8">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg text-secondary transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <h2 id="estimation-modal-title" className="pr-12 font-headline text-2xl font-black tracking-tight text-on-surface">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export default function EstimationPage() {
  const [rating, setRating] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Votre avis - TVM38';
  }, []);

  function handleRating(value: number) {
    setRating(value);
    setSubmitError(null);
    if (value >= 4) {
      window.open(GOOGLE_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    setSent(false);
    setReviewOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setSubmitError(null);
    const form = new FormData(event.currentTarget);
    const champ = (nom: string) => (form.get(nom) ?? '').toString();

    try {
      await envoyerMessageContact({
        type: 'avis',
        nom: champ("Nom de l'utilisateur"),
        email: champ('Email de contact'),
        telephone: champ('Numéro de téléphone'),
        note: `${rating}/5`,
        message: champ("Détails de l'avis"),
      });
      setSent(true);
    } catch {
      setSubmitError("L'avis n'a pas pu être envoyé. Vérifiez votre connexion puis réessayez.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-slate-900">
      <div aria-hidden="true" className="fixed inset-0 bg-[linear-gradient(rgba(7,22,39,0.56),rgba(7,22,39,0.72)),url('/fond_page.png')] bg-cover bg-center" />
      <div className="relative flex min-h-[100dvh] flex-col">
        <Header showSecondaryAction={false} />

        <main className="mx-auto grid w-full max-w-6xl flex-1 place-items-center px-4 pb-12 pt-24 sm:px-6 md:pt-28">
          <section className="w-full max-w-xl rounded-xl border border-white/25 bg-white/95 p-6 text-center shadow-[0_24px_80px_rgba(0,28,54,0.30)] backdrop-blur-md sm:p-9">
            <img src="/logo-tvm38.png" alt="TVM38" className="mx-auto h-20 w-auto object-contain" />
            <h1 className="mt-6 font-headline text-3xl font-black tracking-tight text-on-surface sm:text-4xl">
              Comment s'est passée votre expérience ?
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-secondary">
              Sélectionnez la note qui correspond à votre expérience avec TVM38.
            </p>

            <div className="mt-8 border-t border-border/70 pt-7">
              <p className="text-sm font-semibold text-secondary">Votre note</p>
              <div className="mt-4 flex justify-center gap-1 sm:gap-3" role="group" aria-label="Choisissez votre note">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => handleRating(value)} aria-label={`${value} étoile${value > 1 ? 's' : ''} - ${RATING_LABELS[value]}`} className="grid h-12 w-12 place-items-center rounded-lg text-amber-500 transition hover:bg-amber-50 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:h-14 sm:w-14">
                    <Star aria-hidden="true" className="h-8 w-8 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-3 border-t border-border/70 pt-6 sm:grid-cols-2">
              <a href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 active:scale-[0.98]">
                <FileText aria-hidden="true" className="h-4 w-4" />
                Demander un devis
              </a>
              <button type="button" onClick={() => setContactOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]">
                <Phone aria-hidden="true" className="h-4 w-4" />
                Contacter TVM38
              </button>
            </div>
            <a href="https://midali.fr/valorisation-des-materiaux/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary transition hover:text-primary hover:underline">
              Voir la page de la carrière
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          </section>
        </main>

        <Footer compact />
      </div>

      {contactOpen && (
        <Modal title="Contacter TVM38" onClose={() => setContactOpen(false)}>
          <p className="mt-2 text-sm text-secondary">Responsable carrière : Maxime ROMANET</p>
          <div className="mt-6 grid gap-3">
            <a href="tel:0620721960" className="inline-flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface px-4 font-bold text-on-surface transition hover:border-primary/40 hover:text-primary">
              <Phone aria-hidden="true" className="h-5 w-5 text-primary" />
              06 20 72 19 60
            </a>
            <a href="mailto:tvm38@midali.fr" className="inline-flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface px-4 font-bold text-on-surface transition hover:border-primary/40 hover:text-primary">
              <Mail aria-hidden="true" className="h-5 w-5 text-primary" />
              tvm38@midali.fr
            </a>
          </div>
        </Modal>
      )}

      {reviewOpen && (
        <Modal title={sent ? 'Merci pour votre retour' : 'Votre retour nous aide'} onClose={() => setReviewOpen(false)}>
          {sent ? (
            <div className="mt-6 text-center" role="status">
              <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-emerald-600" />
              <p className="mt-4 text-sm leading-relaxed text-secondary">Votre avis a bien été transmis à TVM38.</p>
              <button type="button" onClick={() => setReviewOpen(false)} className="mt-6 min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90">Fermer</button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Vous avez sélectionné {rating} étoile{rating > 1 ? 's' : ''} sur 5. Expliquez-nous votre expérience.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="review-name" className="text-sm font-bold text-on-surface">Prénom et nom</label>
                  <input id="review-name" name="Nom de l'utilisateur" autoComplete="name" required className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-on-surface outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="review-email" className="text-sm font-bold text-on-surface">Email <span className="font-normal text-secondary">(optionnel)</span></label>
                    <input id="review-email" name="Email de contact" type="email" autoComplete="email" className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-on-surface outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="review-phone" className="text-sm font-bold text-on-surface">Téléphone <span className="font-normal text-secondary">(optionnel)</span></label>
                    <input id="review-phone" name="Numéro de téléphone" type="tel" inputMode="tel" autoComplete="tel" onInput={(event) => { event.currentTarget.value = formatPhoneInput(event.currentTarget.value); }} className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-on-surface outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="review-message" className="text-sm font-bold text-on-surface">Votre message</label>
                  <textarea id="review-message" name="Détails de l'avis" required rows={5} className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-3 text-base text-on-surface outline-none transition placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                {submitError && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm font-semibold text-destructive">{submitError}</p>}
                <button type="submit" disabled={sending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                  {sending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {sending ? 'Envoi en cours' : 'Envoyer mon avis'}
                </button>
              </form>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
