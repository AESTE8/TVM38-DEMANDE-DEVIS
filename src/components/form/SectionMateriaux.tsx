import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MATERIAUX, SECTION_ORDER } from '@/data/materiaux';
import { LigneDevis } from '@/types';
import MaterialCard from './MaterialCard';

interface Props {
  lignes: LigneDevis[];
  setLignes: React.Dispatch<React.SetStateAction<LigneDevis[]>>;
}

export default function SectionMateriaux({ lignes, setLignes }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredMateriaux = useMemo(() => {
    return MATERIAUX.filter(m =>
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const groupedMateriaux = useMemo(() => {
    const groups: Record<string, typeof MATERIAUX> = {};
    filteredMateriaux.forEach(mat => {
      if (!groups[mat.section]) groups[mat.section] = [];
      groups[mat.section].push(mat);
    });
    return groups;
  }, [filteredMateriaux]);

  const updateLigne = (materiauId: string, updates: Partial<LigneDevis>) => {
    setLignes(prev => {
      const idx = prev.findIndex(l => l.materiauId === materiauId);
      if (idx >= 0) {
        const newLignes = [...prev];
        newLignes[idx] = { ...newLignes[idx], ...updates };
        return newLignes;
      }
      return [...prev, { materiauId, quantiteTonnes: 0, quantiteM3: 0, modeEntree: 'tonnes', ...updates }];
    });
  };

  const selectedLignes = lignes.filter(l => l.quantiteTonnes > 0);
  const totalTonnes = selectedLignes.reduce((sum, l) => sum + l.quantiteTonnes, 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">03</span>
        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">Matériaux</h2>
      </div>

      <div className="space-y-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-secondary/50" />
          <Input
            placeholder="Ex : gravier, sable, tout-venant..."
            className="pl-10 h-11"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-8">
          {SECTION_ORDER.map(section => {
            const mats = groupedMateriaux[section];
            if (!mats || mats.length === 0) return null;

            return (
              <div key={section} className="space-y-3">
                <h3 className="font-label text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary/70 border-b border-primary/10 pb-1 ml-1">
                  {section}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {mats.map(mat => (
                    <MaterialCard
                      key={mat.id}
                      materiau={mat}
                      ligne={lignes.find(l => l.materiauId === mat.id)}
                      isExpanded={expandedId === mat.id}
                      onToggle={() => setExpandedId(expandedId === mat.id ? null : mat.id)}
                      onUpdate={(updates) => updateLigne(mat.id, updates)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredMateriaux.length === 0 && (
            <p className="text-center text-secondary py-8 text-sm">Aucun matériau trouvé pour cette recherche.</p>
          )}
        </div>
      </div>

      {/* Bandeau flottant récapitulatif */}
      {selectedLignes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-primary text-on-primary rounded-full px-6 py-3 shadow-xl flex items-center gap-3 text-sm font-bold pointer-events-none animate-fade-in">
          <span>
            {selectedLignes.length} matériau{selectedLignes.length > 1 ? 'x' : ''} sélectionné{selectedLignes.length > 1 ? 's' : ''}
          </span>
          <span className="opacity-60">·</span>
          <span>{Math.round(totalTonnes * 10) / 10} t au total</span>
        </div>
      )}
    </div>
  );
}
