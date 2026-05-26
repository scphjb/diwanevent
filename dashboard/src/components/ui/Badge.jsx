import * as React from "react"
import { cn } from "../../utils/cn"

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-slate-800 text-slate-200 hover:bg-slate-700",
    outline: "border border-slate-700 text-slate-400 hover:bg-slate-800/50",
    emerald: "bg-brand-primary/10 text-brand-primary border border-brand-primary/20",
    amber: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    red: "bg-red-500/10 text-red-500 border border-red-500/20",
  }
  
  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
  )
}

export { Badge }
