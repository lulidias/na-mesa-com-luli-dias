// Edge Function: guia-waitlist
// Salva e-mail na tabela guia_waitlist e envia e-mail de boas-vindas via Resend.
// Não requer autenticação (endpoint público).
//
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   — chave Resend (re_...)
//   EMAIL_FROM       — remetente verificado. Ex: "Luli Dias <luli@lulidias.com>"
//
// Deploy: npx supabase functions deploy guia-waitlist --project-ref saotncritqxuchsvvnzi

const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM      = Deno.env.get("EMAIL_FROM") ?? "Luli Dias <luli@lulidias.com>";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ── Template HTML de boas-vindas ──────────────────────────────────────────────

const EMAIL_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bem-vindo — Luli Dias Restaurants &amp; Hotels</title>
</head>
<body style="margin:0;padding:0;background:#EDE7DF;font-family:Arial,Helvetica,sans-serif;">

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EDE7DF;padding:48px 16px;">
  <tr>
    <td align="center">

      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#F7F3EE;border:1px solid #E8E0D5;">

        <!-- MASTHEAD -->
        <tr>
          <td align="center" style="padding:48px 48px 36px;background:#F7F3EE;border-bottom:1px solid #E8E0D5;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:normal;color:#1A1A1A;letter-spacing:14px;text-transform:uppercase;line-height:1;margin-bottom:10px;">LULI DIAS</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#3A3A3A;letter-spacing:6px;text-transform:uppercase;margin-bottom:10px;">RESTAURANTS &amp; HOTELS</div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0;width:280px;">
              <tr>
                <td style="border-bottom:1px solid #B8922A;height:1px;width:128px;"></td>
                <td style="text-align:center;padding:0 10px;color:#B8922A;font-size:11px;vertical-align:middle;">◆</td>
                <td style="border-bottom:1px solid #B8922A;height:1px;width:128px;"></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CORPO -->
        <tr>
          <td style="padding:48px 56px 40px;">

            <p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;color:#1A1A1A;line-height:1.3;margin:0 0 32px;">
              Que bom ter<br>você por aqui.
            </p>

            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#5A5045;line-height:1.8;margin:0 0 20px;">
              O guia ainda não foi lançado — estou nos retoques finais. Mas vai acontecer em breve, e você vai ser um dos primeiros a saber.
            </p>

            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#5A5045;line-height:1.8;margin:0 0 20px;">
              O que você vai encontrar é um guia pessoal de restaurantes e hotéis em <strong style="color:#1A1A1A;font-weight:600;">37 países</strong>. Cada lugar foi visitado, cada conta foi paga — sem convites, sem press trips, sem jantar por conta da casa. Só os lugares que eu genuinamente acho que valem.
            </p>

            <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#5A5045;line-height:1.8;margin:0 0 40px;">
              Te aviso no lançamento. Espero muito que você goste!
            </p>

            <!-- SEPARADOR -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:36px;">
              <tr>
                <td style="border-bottom:1px solid #E8E0D5;height:1px;"></td>
              </tr>
            </table>

            <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#8A7E72;font-style:italic;margin:0 0 4px;">Um abraço,</p>
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1A1A1A;margin:0;">Luli Dias</p>

          </td>
        </tr>

        <!-- ASSINATURA -->
        <tr>
          <td style="background:#FAF6EF;border-top:1px solid #E8E0D5;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding:32px 44px 28px;">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#1A1A1A;letter-spacing:10px;text-transform:uppercase;line-height:1;">LULI DIAS</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#3A3A3A;letter-spacing:5px;text-transform:uppercase;margin-top:6px;">RESTAURANTS &amp; HOTELS</div>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0;width:260px;">
                    <tr>
                      <td style="border-bottom:1px solid #B8922A;height:1px;width:118px;"></td>
                      <td style="text-align:center;padding:0 8px;color:#B8922A;font-size:9px;vertical-align:middle;">◆</td>
                      <td style="border-bottom:1px solid #B8922A;height:1px;width:118px;"></td>
                    </tr>
                  </table>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#7A6A50;letter-spacing:3px;text-transform:uppercase;margin-top:16px;">Personal Guide</div>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0;width:260px;">
                    <tr>
                      <td style="border-bottom:1px solid rgba(184,146,42,0.3);height:1px;"></td>
                    </tr>
                  </table>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#3A3A3A;margin-top:14px;">lulidias@me.com</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;margin-top:6px;">
                    <a href="https://www.instagram.com/lulidias" style="color:#B8922A;text-decoration:none;">@lulidias</a>
                    <span style="color:#B8922A;padding:0 6px;">·</span>
                    <a href="https://lulidias.com" style="color:#B8922A;text-decoration:none;">lulidias.com</a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- RODAPÉ -->
        <tr>
          <td align="center" style="padding:18px 48px;background:#F7F3EE;border-top:1px solid #E8E0D5;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#B0A090;letter-spacing:1px;margin:0;">
              Recebeu este e-mail porque se registou em lulidias.com
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let email: string;
  try {
    const body = await req.json();
    email = (body?.email ?? "").trim().toLowerCase();
  } catch {
    return json({ error: "json_invalido" }, 400);
  }

  if (!email || !email.includes("@")) {
    return json({ error: "email_invalido" }, 400);
  }

  // 1. Salvar na tabela guia_waitlist (duplicados ignorados via ON CONFLICT)
  if (SUPABASE_URL && SUPABASE_KEY) {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/guia_waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ email }),
    });
    if (!dbRes.ok && dbRes.status !== 409) {
      const err = await dbRes.text().catch(() => "");
      console.error("guia_waitlist insert error:", dbRes.status, err);
    }
  }

  // 2. Enviar e-mail de boas-vindas via Resend
  if (RESEND_API_KEY) {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: "Na Mesa com Luli Dias — você está na lista",
        html: EMAIL_HTML,
      }),
    });
    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      console.error("Resend error:", emailRes.status, JSON.stringify(err));
    }
  }

  return json({ ok: true });
});
