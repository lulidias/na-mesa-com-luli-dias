// Edge Function: guia-broadcast
// Envia o e-mail de boas-vindas (PT) a todos os inscritos que ainda não o receberam.
// Protegida por BROADCAST_SECRET — só o Luli pode disparar.
//
// Uso:
//   curl -X POST https://<ref>.supabase.co/functions/v1/guia-broadcast \
//     -H "Content-Type: application/json" \
//     -d '{"secret":"<BROADCAST_SECRET>"}'
//
// Secrets necessários:
//   BROADCAST_SECRET        — token de autorização (definir em Supabase → Secrets)
//   RESEND_API_KEY          — chave Resend
//   EMAIL_FROM              — remetente verificado
//   SUPABASE_URL            — injectado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — injectado automaticamente

const BROADCAST_SECRET    = Deno.env.get("BROADCAST_SECRET") ?? "";
const RESEND_API_KEY      = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM          = Deno.env.get("EMAIL_FROM") ?? "Luli Dias <hi@lulidias.com>";
const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

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
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:36px;">
              <tr><td style="border-bottom:1px solid #E8E0D5;height:1px;"></td></tr>
            </table>
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#8A7E72;font-style:italic;margin:0 0 4px;">Um abraço,</p>
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1A1A1A;margin:0;">Luli Dias</p>
          </td>
        </tr>

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
                    <tr><td style="border-bottom:1px solid rgba(184,146,42,0.3);height:1px;"></td></tr>
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Autorização
  let secret: string;
  try {
    const body = await req.json();
    secret = body?.secret ?? "";
  } catch {
    return json({ error: "json_invalido" }, 400);
  }

  if (!BROADCAST_SECRET || secret !== BROADCAST_SECRET) {
    return json({ error: "nao_autorizado" }, 401);
  }

  // Ler todos os inscritos
  const listRes = await fetch(`${SUPABASE_URL}/rest/v1/guia_waitlist?select=email&order=created_at.asc`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!listRes.ok) {
    return json({ error: "erro_ao_ler_waitlist", status: listRes.status }, 500);
  }
  const rows: { email: string }[] = await listRes.json();

  if (rows.length === 0) {
    return json({ ok: true, sent: 0, message: "Nenhum inscrito encontrado." });
  }

  // Enviar e-mail a cada inscrito (sequencial para não sobrecarregar o Resend)
  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const row of rows) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [row.email],
        subject: "Luli Dias Restaurants & Hotels — você está na lista",
        html: EMAIL_HTML,
      }),
    });
    if (r.ok) {
      results.push({ email: row.email, ok: true });
    } else {
      const err = await r.json().catch(() => ({}));
      console.error("Resend error para", row.email, JSON.stringify(err));
      results.push({ email: row.email, ok: false, error: JSON.stringify(err) });
    }
    // Pausa de 200ms entre envios (respeitar rate limit do Resend)
    await new Promise(r => setTimeout(r, 200));
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  return json({ ok: true, total: rows.length, sent, failed });
});
