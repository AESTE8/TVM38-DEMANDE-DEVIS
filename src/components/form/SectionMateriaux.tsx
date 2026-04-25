import { useState, useMemo } from 'react';
import { Search, Package, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MATERIAUX, SECTION_ORDER } from '@/data/materiaux';
import { LigneDevis, TypeDemande } from '@/types';
import MaterialCard from './MaterialCard';
import { cn } from '@/lib/utils';

const SECTION_DECHARGE = 'Déblais en décharge';

interface Props {
  lignes: LigneDevis[];
  setLignes: React.Dispatch<React.SetStateAction<LigneDevis[]>>;
  typeDemande?: TypeDemande;
  onNext?: () => void;
}

export default function SectionMateriaux({ lignes, setLignes, typeDemande, onNext }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'livraison' | 'decharge'>('livraison');

  const isDecharge = typeDemande === 'decharge';
  const isCombi = typeDemande === 'livraison_decharge';

  const filteredMateriaux = useMemo(() => {
    let base: typeof MATERIAUX;
    if (isDecharge) {
      base = MATERIAUX.filter(m => m.section === SECTION_DECHARGE);
    } else if (isCombi) {
      base = activeTab === 'livraison'
        ? MATERIAUX.filter(m => m.section !== SECTION_DECHARGE)
        : MATERIAUX.filter(m => m.section === SECTION_DECHARGE);
    } else {
      base = MATERIAUX;
    }
    return base.filter(m =>
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, isDecharge, isCombi, activeTab]);

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
      const idx = prev.findIndex(l => l.materiauId === materiauId && (!isCombi || l.type === activeTab));
      const lineType = isCombi ? activeTab : undefined;
      if (idx >= 0) {
        const newLignes = [...prev];
        newLignes[idx] = { ...newLignes[idx], ...updates, type: lineType };
        return newLignes;
      }
      return [...prev, { materiauId, quantiteTonnes: 0, quantiteM3: 0, modeEntree: 'tonnes', ...updates, type: lineType }];
    });
  };

  const getLigne = (materiauId: string) => {
    if (isCombi) return lignes.find(l => l.materiauId === materiauId && l.type === activeTab);
    return lignes.find(l => l.materiauId === materiauId);
  };

  const selectedLignes = lignes.filter(l => l.quantiteTonnes > 0);
  const selectedLivraisonLignes = selectedLignes.filter(l => !isCombi || l.type === 'livraison');
  const selectedDechargeLignes = selectedLignes.filter(l => l.type === 'decharge');
  const totalTonnes = selectedLignes.reduce((sum, l) => sum + l.quantiteTonnes, 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">03</span>
        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">
          {isDecharge ? 'Déblais à déposer' : isCombi ? 'Matériaux & Déblais' : 'Matériaux'}
        </h2>
      </div>

      <div className="space-y-6">
        {/* Onglets — mode livraison + décharge */}
        {isCombi && (
          <div className="flex items-center gap-2 border-b border-border pb-0">
            <button
              type="button"
              onClick={() => { setActiveTab('livraison'); setSearch(''); setExpandedId(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px",
                activeTab === 'livraison'
                  ? "border-primary text-primary"
                  : "border-transparent text-secondary hover:text-on-surface"
              )}
            >
              <Package className="w-4 h-4" />
              Livraison
              {selectedLivraisonLignes.length > 0 && (
                <span className="ml-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {selectedLivraisonLignes.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('decharge'); setSearch(''); setExpandedId(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px",
                activeTab === 'decharge'
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-secondary hover:text-on-surface"
              )}
            >
              <Trash2 className="w-4 h-4" />
              Décharge
              {selectedDechargeLignes.length > 0 && (
                <span className="ml-1 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {selectedDechargeLignes.length}
                </span>
              )}
            </button>
          </div>
        )}

        {isCombi && (
          <p className="text-xs text-secondary font-body">
            {activeTab === 'livraison'
              ? 'Sélectionnez les matériaux que vous souhaitez recevoir sur chantier.'
              : 'Sélectionnez les déblais que notre camion récupérera sur place.'}
          </p>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-secondary/50" />
          <Input
            placeholder={
              isDecharge || (isCombi && activeTab === 'decharge')
                ? 'Ex : béton, enrobé, déblais...'
                : 'Ex : gravier, sable, tout-venant...'
            }
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
                <h3 className={cn(
                  "font-label text-[0.7rem] font-bold uppercase tracking-[0.2em] border-b pb-1 ml-1",
                  isCombi && activeTab === 'decharge'
                    ? "text-purple-500/70 border-purple-100"
                    : "text-primary/70 border-primary/10"
                )}>
                  {section}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {mats.map(mat => (
                    <MaterialCard
                      key={`${mat.id}-${isCombi ? activeTab : 'single'}`}
                      materiau={mat}
                      ligne={getLigne(mat.id)}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-primary text-on-primary rounded-full px-2 py-2 shadow-xl flex items-center gap-3 text-sm font-bold animate-fade-in">
          {isCombi ? (
            <>
              <span className="pl-4 flex items-center gap-2">
                {selectedLivraisonLignes.length > 0 && (
                  <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {selectedLivraisonLignes.length}</span>
                )}
                {selectedLivraisonLignes.length > 0 && selectedDechargeLignes.length > 0 && <span className="opacity-60">·</span>}
                {selectedDechargeLignes.length > 0 && (
                  <span className="flex items-center gap-1"><Trash2 className="w-3.5 h-3.5 text-purple-300" /> {selectedDechargeLignes.length}</span>
                )}
              </span>
              <span className="opacity-60">·</span>
              <span>{Math.round(totalTonnes * 10) / 10} t</span>
            </>
          ) : (
            <>
              <span className="pl-4">
                {selectedLignes.length} matériau{selectedLignes.length > 1 ? 'x' : ''} sélectionné{selectedLignes.length > 1 ? 's' : ''}
              </span>
              <span className="opacity-60">·</span>
              <span>{Math.round(totalTonnes * 10) / 10} t au total</span>
            </>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="ml-2 bg-white text-primary rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/90 transition-colors shrink-0"
              title="Étape suivante"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
