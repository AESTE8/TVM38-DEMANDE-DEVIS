import { Link } from 'react-router-dom';

interface FooterProps {
  compact?: boolean;
}

export default function Footer({ compact = false }: FooterProps) {
  if (compact) {
    return (
      <footer className="border-t border-border/70 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-headline text-sm font-extrabold uppercase text-on-surface">MIDALI - TVM38</p>
            <p className="mt-1 text-xs text-secondary">Carrière et centre de valorisation à Villard-Bonnot.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <a className="font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href="tel:0620721960">
              06 20 72 19 60
            </a>
            <a className="text-secondary transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href="mailto:tvm38@midali.fr">
              tvm38@midali.fr
            </a>
            <Link className="text-secondary transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to="/estimation">
              Donner mon avis
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-surface-container border-t-4 border-primary">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-5 py-10 sm:px-8 md:px-12 md:py-16 w-full max-w-screen-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-lg font-bold text-on-surface uppercase font-headline">MIDALI - TVM38</div>
          <p className="font-body text-sm text-secondary">Expert en vente de matériaux de construction en région Auvergne-Rhône-Alpes.</p>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-headline font-bold text-sm uppercase text-on-surface">Activités</span>
          <span className="font-body text-sm text-secondary">Vente de granulats & recyclés</span>
          <span className="font-body text-sm text-secondary">Livraison sur chantier</span>
          <span className="font-body text-sm text-secondary">Évacuation de gravats</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-headline font-bold text-sm uppercase text-on-surface">Liens utiles</span>
          <a className="inline-flex min-h-11 items-center font-body text-sm text-secondary hover:text-primary transition-colors" href="https://www.midali.fr" target="_blank" rel="noopener">Société MIDALI</a>
          <Link className="inline-flex min-h-11 items-center font-body text-sm text-secondary hover:text-primary transition-colors" to="/estimation">Laisser un avis</Link>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-headline font-bold text-sm uppercase text-on-surface">Contact</span>
          <div className="space-y-1">
            <p className="font-body text-sm text-on-surface font-bold">Maxime ROMANET</p>
            <p className="font-body text-xs text-secondary italic">Responsable de Carrière</p>
          </div>
          <p className="font-body text-sm text-secondary">489 Rue de l'Isle<br/>38190 Villard-Bonnot</p>
          <div className="space-y-1">
            <a className="inline-flex min-h-11 items-center font-body text-sm text-primary font-bold hover:underline" href="tel:0620721960">06 20 72 19 60</a><br/>
            <a className="inline-flex min-h-11 items-center font-body text-sm text-secondary hover:text-primary transition-colors" href="mailto:tvm38@midali.fr">tvm38@midali.fr</a>
          </div>
        </div>
      </div>
      <div className="px-5 py-5 md:px-12 border-t border-white/20 text-center bg-primary">
        <p className="font-body text-xs sm:text-sm text-white/80 italic">© 2026 MIDALI - TVM38. Carrière et centre de valorisation en Isère. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
