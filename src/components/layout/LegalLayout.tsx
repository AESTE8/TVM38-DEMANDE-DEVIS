import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { DATE_MAJ_LEGALE } from '@/data/entreprise';

interface LegalLayoutProps {
  titre: string;
  children: React.ReactNode;
}

/** Mise en page commune aux mentions légales, à la politique de
 *  confidentialité et aux conditions générales d'utilisation. */
export default function LegalLayout({ titre, children }: LegalLayoutProps) {
  useEffect(() => {
    document.title = `${titre} - MIDALI-TVM38`;
  }, [titre]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <Header showSecondaryAction={false} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à l'accueil
        </Link>

        <h1 className="mt-4 font-headline text-2xl font-extrabold uppercase text-on-surface sm:text-3xl">
          {titre}
        </h1>

        <div className="legal-content mt-8 space-y-8 font-body text-sm leading-relaxed text-on-surface">
          {children}
        </div>

        <p className="mt-12 border-t border-border pt-4 text-xs text-secondary">
          Dernière mise à jour : {DATE_MAJ_LEGALE}.
        </p>
      </main>
      <Footer compact />
    </div>
  );
}

/** Section titrée. Les titres restent en H2 pour garder une hiérarchie plate
 *  sous le H1 unique de la page. */
export function LegalSection({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-headline text-base font-bold uppercase text-primary">{titre}</h2>
      {children}
    </section>
  );
}

/** Ligne « libellé : valeur » des mentions légales. */
export function LegalLigne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-secondary">{label} : </span>
      <span>{children}</span>
    </p>
  );
}
