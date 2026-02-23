import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-lg border-2 border-md-gray-200 bg-white px-4 py-3 text-base",
          "text-md-gray-900 placeholder:text-md-gray-400",
          "focus:outline-none focus:border-md-blue focus:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-md-gray-100",
          "resize-none",
          "transition-all duration-250",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
