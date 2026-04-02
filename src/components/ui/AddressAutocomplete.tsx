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

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`);
        const data = await response.json();
        setSuggestions(data.features || []);
        if (data.features?.length > 0) setIsOpen(true);
      } catch (error) {
        console.error('API Adresse error:', error);
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
