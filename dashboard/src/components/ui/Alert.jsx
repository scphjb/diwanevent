import * as React from "react"
import { cn } from "../../utils/cn"

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-slate-900 text-slate-200 border-slate-800",
    destructive: "border-red-500/50 text-red-500 dark:border-red-500 [&>svg]:text-red-500 bg-red-500/10",
    warning: "border-amber-500/50 text-amber-500 bg-amber-500/10",
  }
  return (
    <div
      ref={ref}
      role="alert"
      className={cn("relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground", variants[variant], className)}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-1 font-bold leading-none tracking-tight", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
