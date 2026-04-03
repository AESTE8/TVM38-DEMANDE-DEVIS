import { UseFormRegister } from 'react-hook-form';
import { DevisFormData } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  register: UseFormRegister<DevisFormData>;
}

export default function SectionNotes({ register }: Props) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8 pt-4">
        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">04</span>
        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">Précisions</h2>
      </div>

      <div className="space-y-8">
        <div className="space-y-1">
          <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary" htmlFor="notes">Détails complémentaires</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Précisez ici les contraintes d'accès, les horaires souhaités ou d'autres types de matériaux..."
            rows={5}
            className="w-full bg-surface-container-highest border-none rounded-sm px-4 py-3 focus:ring-0 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all placeholder-on-surface-variant/40 resize-none text-sm font-body"
          />
        </div>
      </div>
    </div>
  );
}
