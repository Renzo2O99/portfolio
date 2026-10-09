"use client";

import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react";

import { cn } from "@/shared/lib/utils";

const labelVariants = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

const Label = forwardRef<ElementRef<"label">, ComponentPropsWithoutRef<"label">>(({ className, ...props }, ref) => <label ref={ref} className={cn(labelVariants, className)} {...props} />);
Label.displayName = "Label";

export { Label };
