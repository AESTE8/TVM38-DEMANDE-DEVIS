import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  // Quand le header porte un badge client, logo + texte + badge + CTA ne
  // tiennent plus sous sm : le nom de marque se tronquait en « MIDALI - T… ».
  // Le logo suffit alors à identifier le site sur ces largeurs.
  const avecBadge = Boolean(children);

  return (
    <nav aria-label="Navigation principale" className="fixed top-0 z-50 w-full border-b border-white/20 bg-primary/95 backdrop-blur-md shadow-[0_4px_22px_rgba(0,45,87,0.22)]">
      <div className="mx-auto flex min-h-16 w-full max-w-screen-2xl items-center justify-between px-4 py-2 md:min-h-[76px] md:px-8">
        {/* min-w-0 : sans lui le titre en whitespace-nowrap pousse les actions
            hors de l'écran sur les petits mobiles (≤ 360px). */}
        <Link
          to="/"
          className="flex min-h-11 min-w-11 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 transition-all hover:opacity-95 sm:gap-2.5 lg:gap-3.5"
        >
          <img src="/logo-tvm38.png" alt="TVM38 Logo" className="h-9 w-auto shrink-0 object-contain transition-transform duration-300 hover:scale-105 sm:h-10 lg:h-13" />
          <div className={cn("min-w-0 flex-col", avecBadge ? "hidden sm:flex" : "flex")}>
            <span className="-mb-0.5 truncate font-headline text-sm font-black uppercase tracking-tighter text-white sm:text-base lg:text-2xl">
              MIDALI - TVM38
            </span>
            <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-white/80 lg:text-[10px]">
              Isère & Grésivaudan
            </span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {children}

          <Link
            to="/estimation"
            className="hidden min-h-11 items-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-tight text-white transition-all hover:bg-white/20 hover:border-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-95 lg:inline-flex"
          >
            Donnez votre avis
          </Link>

          <Link
            to="/formulaire"
            aria-label="Demander un devis"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-industrial-gradient px-4 py-2.5 font-headline text-xs font-extrabold uppercase tracking-tight text-on-primary shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:translate-y-0 active:scale-98 md:px-5 motion-reduce:transform-none"
          >
            <FilePlus2 aria-hidden="true" className="h-5 w-5 stroke-[2.5]" />
            <span className="hidden sm:inline">Demander un devis</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
