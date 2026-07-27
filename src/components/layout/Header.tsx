import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { FilePlus2 } from 'lucide-react';

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <nav aria-label="Navigation principale" className="fixed top-0 z-50 w-full border-b border-white/15 bg-primary shadow-[0_4px_22px_rgba(0,45,87,0.18)]">
      <div className="mx-auto flex min-h-16 w-full max-w-screen-2xl items-center justify-between px-4 py-2 md:min-h-[76px] md:px-8">
        <Link
          to="/"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:gap-3"
        >
          <img src="/logo-tvm38.png" alt="TVM38" className="h-9 w-auto lg:h-12" />
          <div className="flex flex-col">
            <span className="-mb-0.5 whitespace-nowrap font-headline text-base font-black uppercase tracking-tighter text-white lg:text-2xl">
              MIDALI - TVM38
            </span>
            <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 lg:text-[10px]">
              Isère & Grésivaudan
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          {children}

          <Link
            to="/estimation"
            className="hidden min-h-11 items-center rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-tight text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:inline-flex"
          >
            Donnez votre avis
          </Link>

          <Link
            to="/formulaire"
            aria-label="Demander un devis"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-industrial-gradient px-3 py-2 font-headline text-xs font-extrabold uppercase tracking-tight text-on-primary shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-0 md:px-5 motion-reduce:transform-none"
          >
            <FilePlus2 aria-hidden="true" className="h-5 w-5" />
            <span className="hidden sm:inline">Demander un devis</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
