"use server";

import { Resend } from "resend";
import { contactFormSchema } from "../models/contact.schema";

export type SendEmailResult = {
  success: boolean;
  data?: { id?: string };
  error?: string;
};

// EXCEPTION: Formulario de contacto público accesible a visitantes anónimos sin sesión previa.
// PLAN: Implementar validación de turnstile/captcha y rate limiting distribuido en middleware.
// TIMELINE: Q4 2026

export async function sendEmail(values: unknown): Promise<SendEmailResult> {
  const parsed = contactFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Datos de formulario inválidos",
    };
  }

  const { name, email, message } = parsed.data;
  const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

  try {
    const { data, error } = await resend.emails.send({
      from: `${name} <onboarding@resend.dev>`,
      to: ["hello@vipulkumar.dev"],
      subject: "Customer Email",
      text: `Email = ${email} \n\nName = ${name} \n\nMessage = ${message}`,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data ? { id: data.id } : undefined,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error inesperado al enviar correo";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
