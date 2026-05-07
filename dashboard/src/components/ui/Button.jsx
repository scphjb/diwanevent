import * as React from "react"
import { cn } from "../../utils/cn"

const Button = React.forwardRef(({ className, variant = "primary", size = "md", ...props }, ref) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/20",
    outline: "border-2 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10",
    gold: "bg-gradient-to-r from-amber-400 to-amber-600 text-emerald-950 font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-900/20",
  }
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
