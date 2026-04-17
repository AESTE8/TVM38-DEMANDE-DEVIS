import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (company: any) => void;
  placeholder?: string;
  className?: string;
  clientType?: string;
}

export default function CompanyAutocomplete({ value, onChange, onSelect, placeholder, className, clientType }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.length < 1) {
      setSuggestions([]);
      return;
    }

    if (justSelected.current) {
      justSelected.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from('clients')
          .select('id, nom, code, type, adresse, adresse_structuree, telephone, email, contacts, agences')
          .ilike('nom', `%${value}%`);

        if (clientType) {
          query = query.eq('type', clientType);
        } else {
          query = query.neq('type', 'professionnel_sans_compte');
        }

        const { data, error } = await query.limit(5);

        if (error) throw error;
        setSuggestions(data || []);
        if (data && data.length > 0) setIsOpen(true);
      } catch (error) {
        console.error('Erreur Supabase:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-border mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-muted cursor-pointer text-sm transition-colors border-b last:border-0"
              onClick={() => {
                justSelected.current = true;
                onSelect(s);
                setIsOpen(false);
              }}
            >
              {/* NOTE: Adapter ici si le nom de la colonne est différent */}
              <div className="font-medium">{s.nom}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
