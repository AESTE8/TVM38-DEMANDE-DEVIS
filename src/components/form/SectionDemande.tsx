import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { DevisFormData } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AddressAutocomplete from '../ui/AddressAutocomplete';
import { cn } from '@/lib/utils';

interface Props {
  register: UseFormRegister<DevisFormData>;
  errors: FieldErrors<DevisFormData>;
  watch: UseFormWatch<DevisFormData>;
  setValue: UseFormSetValue<DevisFormData>;
}

export default function SectionDemande({ register, errors, watch, setValue }: Props) {
  const typeDemande = watch('typeDemande');
  const creneau = watch('creneau');
  const adresseLivraison = watch('adresseLivraison') || '';
  const entrepriseAdresse = watch('entrepriseAdresse') || '';

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <span className="font-headline font-black text-4xl text-surface-variant/50 leading-none">02</span>
        <h2 className="font-headline font-bold text-2xl uppercase tracking-tight">Projet</h2>
      </div>

      <div className="space-y-6">
        {/* Type de demande — cartes visuelles */}
        <div>
          <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-3">Type de demande</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                val: 'livraison',
                icon: '🚛',
                title: 'Livraison avec transport',
                desc: 'On livre les matériaux directement sur votre chantier',
              },
              {
                val: 'fourniture',
                icon: '📦',
                title: 'Fourniture uniquement',
                desc: 'Vous venez récupérer les matériaux à notre carrière',
              },
            ].map(({ val, icon, title, desc }) => (
              <button
                key={val}
                type="button"
                onClick={() => setValue('typeDemande', val as 'livraison' | 'fourniture', { shouldValidate: true })}
                className={cn(
                  "p-5 rounded-xl border-2 text-left transition-all",
                  typeDemande === val
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-surface-container-highest hover:border-primary/30"
                )}
              >
                <div className="text-2xl mb-2">{icon}</div>
                <div className={cn("font-bold text-sm mb-1", typeDemande === val ? "text-primary" : "text-on-surface")}>{title}</div>
                <div className="text-xs text-secondary leading-relaxed">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message carrière si fourniture */}
        {typeDemande === 'fourniture' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-highest border border-border animate-fade-in">
            <span className="text-primary text-lg shrink-0">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-on-surface">
                Vous récupérez les matériaux directement à notre carrière :
              </p>
              <p className="text-sm text-secondary mt-0.5">489 Rue de l'Isle, 38190 Villard-Bonnot</p>
            </div>
          </div>
        )}

        {/* Champs livraison */}
        {typeDemande === 'livraison' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="adresseLivraison" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center">
                <div>Adresse de livraison (chantier) <span className="text-destructive">*</span></div>
                {entrepriseAdresse && (
                  <label className="flex items-center gap-1.5 cursor-pointer normal-case text-xs font-medium text-secondary hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      className="accent-primary w-3.5 h-3.5"
                      checked={adresseLivraison === entrepriseAdresse}
                      onChange={(e) => {
                        setValue('adresseLivraison', e.target.checked ? entrepriseAdresse : '', { shouldValidate: true });
                      }}
                    />
                    Même adresse que le siège
                  </label>
                )}
              </Label>
              <AddressAutocomplete
                value={adresseLivraison}
                onChange={(val) => setValue('adresseLivraison', val)}
                onSelect={(val) => setValue('adresseLivraison', val, { shouldValidate: true })}
                placeholder="Rechercher l'adresse du chantier..."
              />
              {errors.adresseLivraison && <p className="text-xs text-destructive mt-1">{errors.adresseLivraison.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateSouhaitee" className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full">
                <span>Date souhaitée</span>
                <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
              </Label>
              <Input id="dateSouhaitee" type="date" {...register('dateSouhaitee')} />
            </div>

            {watch('dateSouhaitee') && (
              <div className="space-y-1 animate-fade-in">
                <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary flex justify-between items-center w-full mb-3">
                  <span>Créneau préféré</span>
                  <span className="text-[10px] normal-case font-medium opacity-60">(optionnel)</span>
                </Label>
                <RadioGroup
                  value={creneau ?? 'indifferent'}
                  onValueChange={(val: 'matin' | 'apres_midi' | 'indifferent') => setValue('creneau', val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="matin" id="matin" className="border-primary text-primary" />
                    <Label htmlFor="matin" className="font-normal cursor-pointer text-sm font-body">Matin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="apres_midi" id="apres_midi" className="border-primary text-primary" />
                    <Label htmlFor="apres_midi" className="font-normal cursor-pointer text-sm font-body">Après-midi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indifferent" id="indifferent" className="border-primary text-primary" />
                    <Label htmlFor="indifferent" className="font-normal cursor-pointer text-sm font-body">Indifférent</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
