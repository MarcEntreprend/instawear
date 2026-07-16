// supabase/functions/send-email/index.ts
// Envoi d'emails transactionnels via Resend

// @ts-nocheck

import { Resend } from "npm:resend@3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS")
      return new Response("ok", { headers: corsHeaders });

    const { to, subject, html } = await req.json().catch(() => ({}));
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "to, subject, html requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL")!,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
