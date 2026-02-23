import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border-2 border-md-gray-200 bg-white px-4 py-3 text-base",
          "text-md-gray-900 placeholder:text-md-gray-400",
          "focus:outline-none focus:border-md-blue focus:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-md-gray-100",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "transition-all duration-250",
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
