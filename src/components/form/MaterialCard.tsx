import { Materiau, LigneDevis } from '@/types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import QuantityPanel from './QuantityPanel';

interface Props {
  materiau: Materiau;
  ligne: LigneDevis | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<LigneDevis>) => void;
}

export default function MaterialCard({ materiau, ligne, isExpanded, onToggle, onUpdate }: Props) {
  const isSelected = !!ligne && ligne.quantiteTonnes > 0;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center text-left px-5 py-3.5 rounded-sm transition-all duration-150 border-l-4 group",
          isSelected
            ? "bg-primary/8 border-primary shadow-sm"
            : isExpanded
              ? "bg-surface-container-highest border-primary/50"
              : "bg-surface-container-highest border-transparent hover:bg-surface-container-low hover:border-primary/30"
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mr-3 transition-all duration-150",
          isSelected ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
        )}>
          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <span className={cn(
          "font-bold text-sm flex-1 uppercase tracking-tight transition-colors",
          isSelected ? "text-primary" : "text-on-surface"
        )}>
          {materiau.nom}
        </span>
        {isSelected && (
          <span className="bg-primary text-on-primary text-xs font-bold px-2.5 py-0.5 rounded-sm ml-2 shrink-0 tabular-nums">
            {ligne.quantiteTonnes} t
          </span>
        )}
      </button>

      {isExpanded && (
        <QuantityPanel
          materiau={materiau}
          ligne={ligne || { materiauId: materiau.id, quantiteTonnes: 0, quantiteM3: 0, modeEntree: 'tonnes' }}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
