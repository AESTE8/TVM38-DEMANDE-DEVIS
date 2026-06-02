import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'react-day-picker/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function DatePicker({ value, onChange, placeholder = 'Choisir une date', className }: DatePickerProps) {
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
      {/* Bouton déclencheur */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm text-left transition-colors',
          'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="truncate capitalize">{selected ? formatFR(selected) : placeholder}</span>
        <Calendar className="w-4 h-4 text-secondary shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 rounded-xl border border-border bg-surface shadow-xl animate-fade-in select-none">
          <DayPicker
            mode="single"
            locale={fr}
            selected={selected}
            defaultMonth={selected ?? today}
            disabled={[{ before: today }, { dayOfWeek: [0, 6] }]}
            onSelect={(date) => {
              if (date) { onChange(toISO(date)); setOpen(false); }
            }}
            classNames={{
              root: 'p-4 w-72',
              months: '',
              month: '',
              month_caption: 'flex items-center justify-between mb-4 px-1',
              caption_label: 'text-sm font-bold text-on-surface capitalize',
              nav: 'flex items-center gap-1',
              button_previous: cn(
                'p-1.5 rounded-md transition-colors text-secondary hover:text-primary hover:bg-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
              ),
              button_next: cn(
                'p-1.5 rounded-md transition-colors text-secondary hover:text-primary hover:bg-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
              ),
              month_grid: 'w-full',
              weekdays: 'flex mb-1',
              weekday: 'w-9 h-8 flex items-center justify-center text-[0.65rem] font-bold uppercase text-secondary/70',
              weeks: '',
              week: 'flex',
              day: 'p-0',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />,
              DayButton: ({ day: _day, modifiers, ...props }) => (
                <button
                  {...props}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm flex items-center justify-center transition-colors m-px font-medium',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    modifiers.selected && 'bg-primary text-white shadow-sm',
                    modifiers.today && !modifiers.selected && 'border-2 border-primary/50 text-primary font-bold',
                    modifiers.outside && 'text-secondary/30',
                    modifiers.disabled
                      ? 'text-secondary/30 cursor-not-allowed'
                      : !modifiers.selected && 'hover:bg-primary/10 hover:text-primary cursor-pointer',
                  )}
                />
              ),
            }}
          />
          {value && (
            <div className="border-t border-border/40 px-4 py-2.5 flex justify-end">
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
