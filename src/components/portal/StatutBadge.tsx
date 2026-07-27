import { cn } from '@/lib/utils';
import { STATUT_LABELS, STATUT_STYLES, StatutAffaire } from '@/lib/portal';

interface StatutBadgeProps {
  statut: StatutAffaire;
  className?: string;
}

export default function StatutBadge({ statut, className }: StatutBadgeProps) {
  const style = STATUT_STYLES[statut];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-wider font-headline',
        style.fond,
        style.texte,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.pastille)} />
      {STATUT_LABELS[statut]}
    </span>
  );
}
