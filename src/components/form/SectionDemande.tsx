import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { DevisFormData } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AddressAutocomplete from '../ui/AddressAutocomplete';

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
        <div>
          <Label className="font-label text-[0.7rem] font-bold uppercase tracking-wider text-secondary block mb-3">Type de demande</Label>
          <RadioGroup 
            value={typeDemande} 
            onValueChange={(val: 'livraison' | 'fourniture') => setValue('typeDemande', val, { shouldValidate: true })}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="livraison" id="liv" className="border-primary text-primary" />
              <Label htmlFor="liv" className="font-medium cursor-pointer text-sm font-body">Livraison avec transport</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fourniture" id="fou" className="border-primary text-primary" />
              <Label htmlFor="fou" className="font-medium cursor-pointer text-sm font-body">Fourniture uniquement</Label>
            </div>
          </RadioGroup>
        </div>

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
