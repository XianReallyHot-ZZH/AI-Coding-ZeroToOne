import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary",
        secondary:
          "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
        destructive:
          "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
        success:
          "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400",
        warning:
          "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
        info:
          "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
        outline:
          "border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300",
        platform:
          "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 text-blue-600 dark:text-blue-400",
        project:
          "bg-gradient-to-r from-violet-50 to-pink-50 dark:from-violet-500/10 dark:to-pink-500/10 text-violet-600 dark:text-violet-400",
        feature:
          "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 text-emerald-600 dark:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
