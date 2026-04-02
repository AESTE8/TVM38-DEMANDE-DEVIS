import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full bg-surface-container-highest border-none rounded-sm px-4 py-3 focus:ring-0 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all placeholder-on-surface-variant/40 text-sm font-body text-on-surface file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
