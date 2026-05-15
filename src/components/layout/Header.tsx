import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md shadow-lg" style={{ backgroundColor: 'rgba(0, 83, 161, 0.65)' }}>
      <div className="flex justify-between items-center w-full px-4 md:px-8 py-2 md:py-3 max-w-screen-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <img src="/logo-tvm38.png" alt="Logo TVM38" className="h-8 md:h-12 w-auto" />
          <div className="flex flex-col">
            <span className="text-base md:text-2xl font-black tracking-tighter text-white uppercase font-headline -mb-0.5 whitespace-nowrap">MIDALI - TVM38</span>
            <span className="text-[9px] md:text-[10px] font-bold text-white/70 tracking-[0.2em] uppercase whitespace-nowrap">Isère & Grésivaudan</span>
          </div>
        </Link>

        <div className="flex gap-2 md:gap-4 items-center">
          {children}

          <Link
            to="/estimation"
            className="hidden sm:inline-block text-xs font-black uppercase tracking-tighter text-on-surface hover:text-primary transition-colors py-2 px-4 bg-surface-container-highest rounded-sm border-l-4 border-primary"
          >
            Donnez votre avis
          </Link>

          <button
            onClick={() => document.getElementById('devis-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden sm:block bg-industrial-gradient text-on-primary font-headline font-extrabold py-1.5 px-4 md:py-2 md:px-8 rounded-sm scale-100 active:scale-95 transition-all uppercase tracking-tighter text-xs md:text-base shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            DEMANDER UN DEVIS
          </button>
        </div>
      </div>
    </nav>
  );
}
