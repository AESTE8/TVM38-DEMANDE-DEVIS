import { cn } from "@/lib/utils"

interface BadgeProps {
  variant?: 'required' | 'optional';
  className?: string;
}

export default function Badge({ variant = 'optional', className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0",
        variant === 'required'
          ? "bg-primary text-white"
          : "bg-surface-container text-secondary/60 border border-border/50",
        className
      )}
    >
      {variant === 'required' ? '*' : 'Optionnel'}
    </span>
  );
}
