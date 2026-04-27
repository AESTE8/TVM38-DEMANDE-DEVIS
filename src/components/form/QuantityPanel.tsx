import { Materiau, LigneDevis } from '@/types';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useRef } from 'react';

interface Props {
  materiau: Materiau;
  ligne: LigneDevis;
  onUpdate: (updates: Partial<LigneDevis>) => void;
}

export default function QuantityPanel({ materiau, ligne, onUpdate }: Props) {
  const isTonnes = ligne.modeEntree === 'tonnes';
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  
  // On utilise des Refs pour toujours avoir la valeur la plus à jour dans les Timers sans re-render
  const currentLigneRef = useRef(ligne);
  currentLigneRef.current = ligne;

  const setUnit = (unit: 'tonnes' | 'm3') => {
    if (ligne.modeEntree === unit) return;
    onUpdate({ modeEntree: unit });
  };

  const updateInput = useCallback((val: number) => {
    if (isNaN(val) || val < 0) val = 0;
    
    if (isTonnes) {
      const m3 = Math.round((val / materiau.masseVolumique) * 100) / 100;
      onUpdate({ quantiteTonnes: val, quantiteM3: m3 });
    } else {
      const tonnes = Math.round((val * materiau.masseVolumique) * 100) / 100;
      onUpdate({ quantiteTonnes: tonnes, quantiteM3: val });
    }
  }, [isTonnes, materiau.masseVolumique, onUpdate]);

  const startAdjusting = (delta: number) => {
    // Action immédiate
    const curr = isTonnes ? currentLigneRef.current.quantiteTonnes : currentLigneRef.current.quantiteM3;
    updateInput(Math.max(0, curr + delta));

    // Nettoyage au cas où
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const c = isTonnes ? currentLigneRef.current.quantiteTonnes : currentLigneRef.current.quantiteM3;
        updateInput(Math.max(0, c + delta));
      }, 60);
    }, 400);
  };

  const stopAdjusting = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  return (
    <div className="bg-surface-container-low border-l-4 border-l-primary/40 rounded-r-sm p-4 mt-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="pt-2"></div>

      <div className="flex items-center justify-center gap-2 mb-4 bg-surface-container-highest p-1 rounded-sm w-full max-w-[240px] mx-auto">
        <button
          type="button"
          onClick={() => setUnit('tonnes')}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors",
            isTonnes ? "bg-primary text-on-primary shadow-sm" : "text-secondary hover:bg-surface-variant"
          )}
        >
          Tonnes
        </button>
        <button
          type="button"
          onClick={() => setUnit('m3')}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors",
            !isTonnes ? "bg-primary text-on-primary shadow-sm" : "text-secondary hover:bg-surface-variant"
          )}
        >
          m³
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onMouseDown={() => startAdjusting(-1)}
            onMouseUp={stopAdjusting}
            onMouseLeave={stopAdjusting}
            onTouchStart={(e) => { e.preventDefault(); startAdjusting(-1); }}
            onTouchEnd={(e) => { e.preventDefault(); stopAdjusting(); }}
            className="w-10 h-10 rounded-sm bg-surface-container-highest flex items-center justify-center hover:bg-surface-variant hover:text-primary transition-colors select-none active:bg-surface-dim"
          >
            <Minus size={18} />
          </button>
          <div className="flex items-center w-36 relative">
            <input
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={isTonnes ? (ligne.quantiteTonnes || '') : (ligne.quantiteM3 || '')}
              onChange={(e) => updateInput(parseFloat(e.target.value))}
              className="w-full text-center text-2xl font-black font-headline border-none outline-none focus:ring-0 bg-transparent p-0 text-on-surface"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary font-bold">
              {isTonnes ? 't' : 'm³'}
            </span>
          </div>
          <button 
            type="button" 
            onMouseDown={() => startAdjusting(1)}
            onMouseUp={stopAdjusting}
            onMouseLeave={stopAdjusting}
            onTouchStart={(e) => { e.preventDefault(); startAdjusting(1); }}
            onTouchEnd={(e) => { e.preventDefault(); stopAdjusting(); }}
            className="w-10 h-10 rounded-sm bg-surface-container-highest flex items-center justify-center hover:bg-surface-variant hover:text-primary transition-colors select-none active:bg-surface-dim"
          >
            <Plus size={18} />
          </button>
        </div>
        
        {ligne.quantiteTonnes > 0 && (
          <div className="mt-3 text-xs text-secondary font-bold tracking-wider">
            {isTonnes ? `≈ ${ligne.quantiteM3} m³` : `≈ ${ligne.quantiteTonnes} t`}
          </div>
        )}
      </div>
    </div>
  );
}
