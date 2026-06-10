import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import nodemailer from 'npm:nodemailer'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipients, subject, html } = await req.json()
    const GMAIL_USER = Deno.env.get('GMAIL_USER')
    const GMAIL_PASS = Deno.env.get('GMAIL_PASS')

    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error('Credenciais do Gmail (GMAIL_USER ou GMAIL_PASS) não configuradas no Supabase.')
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    })

    const mailOptions = {
      from: `Relatórios T&T <${GMAIL_USER}>`,
      to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
      subject: subject,
      html: html,
    }

    const info = await transporter.sendMail(mailOptions)

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
