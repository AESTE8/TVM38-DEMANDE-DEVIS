import { Materiau, LigneDevis } from '@/types';
import { cn } from '@/lib/utils';
import QuantityPanel from './QuantityPanel';

interface Props {
  materiau: Materiau;
  ligne: LigneDevis | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<LigneDevis>) => void;
  onRemove: () => void;
}

export default function MaterialCard({ materiau, ligne, isExpanded, onToggle, onUpdate, onRemove }: Props) {
  const isSelected = !!ligne && ligne.quantiteTonnes > 0;

  return (
    <div className="flex flex-col mb-2">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center text-left px-5 py-4 rounded-sm transition-all border-l-4",
          isSelected 
            ? "bg-surface-container-low border-primary shadow-sm" 
            : isExpanded
              ? "bg-surface-container-highest border-primary/40"
              : "bg-surface-container-highest border-transparent hover:bg-surface-container-low hover:border-primary/20"
        )}
      >
        <span className="font-bold text-sm flex-1 text-on-surface uppercase tracking-tight">{materiau.nom}</span>
        {isSelected && (
          <span className="bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-sm ml-2 shrink-0">
            {ligne.quantiteTonnes} t
          </span>
        )}
      </button>

      {isExpanded && (
        <QuantityPanel
          materiau={materiau}
          ligne={ligne || { materiauId: materiau.id, quantiteTonnes: 0, quantiteM3: 0, modeEntree: 'tonnes' }}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}
