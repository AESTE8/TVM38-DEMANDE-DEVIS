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

  // Group materials by section
  const groupedMateriaux = useMemo(() => {
    const groups: Record<string, typeof MATERIAUX> = {};
    
    // If searching, just group whatever matches
    // If not searching, use SECTION_ORDER to ensure categories appear even if empty (optional)
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
            placeholder="Rechercher un type de matériau..." 
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
    </div>
  );
}
