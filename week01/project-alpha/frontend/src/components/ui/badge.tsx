import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-md-blue-light text-md-blue border border-md-blue/10",
        secondary:
          "bg-md-gray-100 text-md-gray-600 border border-md-gray-200/50",
        destructive:
          "bg-red-50 text-red-600 border border-red-200/50",
        success:
          "bg-teal-50 text-md-teal border border-teal-200/50",
        warning:
          "bg-amber-50 text-md-duck-orange border border-amber-200/50",
        info:
          "bg-md-blue-light text-md-blue border border-md-blue/10",
        outline:
          "border-2 border-md-gray-200 text-md-gray-600 bg-transparent",
        yellow:
          "bg-md-yellow-pale text-md-blue border border-md-yellow",
        dark:
          "bg-md-blue text-md-yellow border border-md-blue",
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
