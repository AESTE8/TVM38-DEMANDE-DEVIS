import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-sm border-b border-border/30">
      <div className="flex justify-between items-center w-full px-4 md:px-8 py-3 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo-tvm38.png" alt="Logo TVM38" className="h-10 md:h-12 w-auto" />
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black tracking-tighter text-on-surface uppercase font-headline -mb-1">MIDALI - TVM38</span>
            <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase opacity-80">Isère & Grésivaudan</span>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <Link 
            to="/estimation"
            className="hidden sm:inline-block text-xs font-black uppercase tracking-tighter text-on-surface hover:text-primary transition-colors py-2 px-4 bg-surface-container-highest rounded-sm border-l-4 border-primary"
          >
            Donnez votre avis
          </Link>
          
          <button
            onClick={() => document.getElementById('devis-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-industrial-gradient text-on-primary font-headline font-extrabold py-2 px-6 md:px-8 rounded-sm scale-100 active:scale-95 transition-all uppercase tracking-tighter text-sm md:text-base shadow-lg shadow-primary/20"
          >
            DEMANDER UN DEVIS
          </button>
        </div>
      </div>
    </nav>
  );
}
