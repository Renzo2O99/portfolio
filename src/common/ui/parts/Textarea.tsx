import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return <textarea className={cn("fontsize-inherit flex min-h-[80px] w-full rounded-md  border-input !bg-transparent py-2  ring-offset-background placeholder:text-colorSecondaryDark focus-visible:outline-none  disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />;
});
Textarea.displayName = "Textarea";

export { Textarea };
