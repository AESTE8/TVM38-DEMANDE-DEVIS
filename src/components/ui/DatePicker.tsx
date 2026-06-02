import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'react-day-picker/locale';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

function toDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const today = new Date();
today.setHours(0, 0, 0, 0);

export default function DatePicker({ value, onChange, placeholder = 'Sélectionner une date', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = toDate(value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{selected ? formatFR(selected) : placeholder}</span>
        <Calendar className="w-4 h-4 text-secondary shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 rounded-xl border border-border bg-surface shadow-xl animate-fade-in">
          <style>{`
            .rdp-root { --rdp-accent-color: hsl(var(--primary)); --rdp-accent-background-color: hsl(var(--primary) / 0.1); }
          `}</style>
          <DayPicker
            mode="single"
            locale={fr}
            selected={selected}
            defaultMonth={selected ?? today}
            disabled={[{ before: today }, { dayOfWeek: [0, 6] }]}
            onSelect={(date) => {
              if (date) {
                onChange(toISO(date));
                setOpen(false);
              }
            }}
          />
          {value && (
            <div className="px-4 pb-3 flex justify-end">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-secondary hover:text-destructive transition-colors underline underline-offset-2"
              >
                Effacer la date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
