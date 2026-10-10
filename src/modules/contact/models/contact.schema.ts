import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1, {
    message: "This field has to be filled.",
  }),
  email: z.string().min(1, { message: "This field has to be filled." }).email("This is not a valid email."),
  message: z.string().min(1, { message: "This field has to be filled." }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
