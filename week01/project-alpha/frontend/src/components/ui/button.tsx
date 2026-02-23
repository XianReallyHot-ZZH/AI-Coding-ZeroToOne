import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-md-yellow text-md-blue border-2 border-md-blue shadow-md-card hover:shadow-md-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-md-card-active active:translate-x-px active:translate-y-px rounded-md",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-destructive shadow-md-card hover:shadow-md-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-md-card-active active:translate-x-px active:translate-y-px rounded-md",
        outline:
          "border-2 border-md-gray-200 bg-transparent text-md-blue hover:border-md-blue hover:bg-md-blue-light rounded-md",
        secondary:
          "bg-md-gray-100 text-md-gray-900 border-2 border-md-gray-200 hover:bg-md-gray-200 rounded-md",
        ghost: "text-md-blue hover:bg-md-blue-light hover:text-md-blue rounded-md",
        link: "text-md-blue underline-offset-4 hover:underline rounded-none",
        dark: "bg-md-blue text-md-yellow border-2 border-md-blue shadow-md-card hover:shadow-md-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-md-card-active active:translate-x-px active:translate-y-px rounded-md",
        yellow: "bg-md-yellow text-md-blue border-2 border-md-blue shadow-md-card hover:shadow-md-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-md-card-active active:translate-x-px active:translate-y-px rounded-md",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10 rounded-md",
        iconSm: "h-8 w-8 rounded-md",
        iconLg: "h-12 w-12 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
