"use client"

import * as React from "react"

import { cn } from "@/shared/lib/utils"

const labelVariants = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"

const Label = React.forwardRef<
  React.ElementRef<"label">,
  React.ComponentPropsWithoutRef<"label">
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(labelVariants, className)}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
