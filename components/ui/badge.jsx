import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-w-full truncate sm:px-2 sm:py-0.5 sm:text-xs md:px-2.5 md:py-0.5 md:text-xs",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ 
  className, 
  variant, 
  mobileTruncate = true, 
  mobileSize = 'sm', 
  ...props 
}) {
  const mobileClasses = mobileTruncate 
    ? "max-w-full overflow-hidden whitespace-nowrap text-ellipsis" 
    : "";
  
  const mobileSizeClasses = {
    'xs': "text-[10px] px-1.5 py-0.5",
    'sm': "text-xs px-2 py-0.5",
    'md': "text-xs px-2.5 py-0.5"
  }[mobileSize];

  return (
    <div 
      className={cn(
        badgeVariants({ variant }), 
        mobileClasses, 
        mobileSizeClasses, 
        className
      )} 
      {...props} 
    />
  )
}

export { Badge, badgeVariants }