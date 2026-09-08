import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (addr: string) => void;
  placeholder?: string;
  className?: string;
}

interface AddressFeature {
  properties: {
    label: string;
    context?: string;
  };
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<AddressFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextFetchRef = useRef(false);

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
    if (value.length < 3) {
      return;
    }

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await response.json() as { features?: AddressFeature[] };
        const features = data.features ?? [];
        setSuggestions(features);
        if (features.length > 0) setIsOpen(true);
      } catch (error) {
        console.error('API Adresse error:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const visibleSuggestions = value.length >= 3 ? suggestions : [];

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />
      {isOpen && visibleSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-border mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
          {visibleSuggestions.map((s) => (
            <li
              key={s.properties.label}
              className="px-4 py-2 hover:bg-muted cursor-pointer text-sm transition-colors border-b last:border-0"
              onClick={() => {
                skipNextFetchRef.current = true;
                setSuggestions([]);
                onSelect(s.properties.label);
                setIsOpen(false);
              }}
            >
              <div className="font-medium">{s.properties.label}</div>
              <div className="text-xs text-muted-foreground">{s.properties.context}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
