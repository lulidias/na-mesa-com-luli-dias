// Edge Function: guia-newsletter
// Envia uma newsletter personalizada a todos os subscritores activos.
//
// POST { secret, subject, html }   → envia para todos
// GET  (Bearer secret)             → lista subscritores + contagem
//
// Secrets necessários (Supabase → Secrets):
//   BROADCAST_SECRET          — token de autorização
//   RESEND_API_KEY            — chave Resend
//   EMAIL_FROM                — remetente verificado (ex: "Luli Dias <hi@lulidias.com>")
//   SUPABASE_URL              — injectado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — injectado automaticamente

const BROADCAST_SECRET  = Deno.env.get("BROADCAST_SECRET") ?? "";
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM        = Deno.env.get("EMAIL_FROM") ?? "Luli Dias <hi@lulidias.com>";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL          = "https://lulidias.com";
const UNSUB_FN_URL      = `https://saotncritqxuchsvvnzi.supabase.co/functions/v1/guia-unsubscribe`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function unsubToken(email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(BROADCAST_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildEmail(subject: string, bodyHtml: string, email: string, token: string): string {
  const unsubUrl = `${UNSUB_FN_URL}?email=${encodeURIComponent(email)}&token=${token}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#EDE7DF;font-family:Arial,Helvetica,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EDE7DF;padding:48px 16px;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#F7F3EE;border:1px solid #E8E0D5;">

      <!-- MASTHEAD -->
      <tr>
        <td align="center" style="padding:40px 48px 32px;background:#F7F3EE;border-bottom:1px solid #E8E0D5;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:normal;color:#1A1A1A;letter-spacing:14px;text-transform:uppercase;line-height:1;margin-bottom:8px;">LULI DIAS</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#3A3A3A;letter-spacing:6px;text-transform:uppercase;margin-bottom:14px;">RESTAURANTS &amp; HOTELS</div>
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:260px;">
            <tr>
              <td style="border-bottom:1px solid #B8922A;height:1px;width:118px;"></td>
              <td style="text-align:center;padding:0 8px;color:#B8922A;font-size:10px;vertical-align:middle;">◆</td>
              <td style="border-bottom:1px solid #B8922A;height:1px;width:118px;"></td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CORPO DA NEWSLETTER -->
      <tr>
        <td style="padding:44px 56px 40px;">
          ${bodyHtml}
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:40px;">
            <tr><td style="border-bottom:1px solid #E8E0D5;height:1px;"></td></tr>
          </table>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#8A7E72;font-style:italic;margin:28px 0 4px;">Um abraço,</p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1A1A1A;margin:0;">Luli Dias</p>
        </td>
      </tr>

      <!-- RODAPÉ -->
      <tr>
        <td style="background:#FAF6EF;border-top:1px solid #E8E0D5;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center" style="padding:28px 44px 24px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;color:#1A1A1A;letter-spacing:10px;text-transform:uppercase;">LULI DIAS</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#3A3A3A;letter-spacing:5px;text-transform:uppercase;margin-top:5px;">RESTAURANTS &amp; HOTELS</div>
                <table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;width:220px;">
                  <tr>
                    <td style="border-bottom:1px solid #B8922A;height:1px;width:98px;"></td>
                    <td style="text-align:center;padding:0 8px;color:#B8922A;font-size:8px;vertical-align:middle;">◆</td>
                    <td style="border-bottom:1px solid #B8922A;height:1px;width:98px;"></td>
                  </tr>
                </table>
                <div style="margin-top:12px;">
                  <a href="https://www.instagram.com/lulidias" style="color:#B8922A;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:10px;">@lulidias</a>
                  <span style="color:#B8922A;padding:0 6px;">·</span>
                  <a href="${SITE_URL}" style="color:#B8922A;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:10px;">lulidias.com</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- UNSUB -->
      <tr>
        <td align="center" style="padding:16px 48px;background:#F7F3EE;border-top:1px solid #E8E0D5;">
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#B0A090;letter-spacing:0.5px;margin:0;">
            Recebeu esta newsletter porque se inscreveu em lulidias.com ·
            <a href="${unsubUrl}" style="color:#B0A090;">cancelar subscrição</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization") ?? "";

  // GET — listar subscritores
  if (req.method === "GET") {
    if (!BROADCAST_SECRET || authHeader !== `Bearer ${BROADCAST_SECRET}`) {
      return json({ error: "nao_autorizado" }, 401);
    }
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/guia_waitlist?select=email,created_at,unsubscribed&order=created_at.desc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    const active = rows.filter((x: { unsubscribed: boolean }) => !x.unsubscribed);
    return json({ total: rows.length, active: active.length, members: rows });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let secret: string, subject: string, html: string, testEmail: string | undefined;
  try {
    const body = await req.json();
    secret    = body?.secret ?? "";
    subject   = body?.subject ?? "";
    html      = body?.html ?? "";
    testEmail = body?.testEmail;
  } catch {
    return json({ error: "json_invalido" }, 400);
  }

  if (!BROADCAST_SECRET || secret !== BROADCAST_SECRET) {
    return json({ error: "nao_autorizado" }, 401);
  }
  if (!subject || !html) return json({ error: "subject_e_html_obrigatorios" }, 400);

  // Modo teste — envia só para um email
  if (testEmail) {
    const token = await unsubToken(testEmail);
    const emailHtml = buildEmail(subject, html, testEmail, token);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [testEmail], subject, html: emailHtml }),
    });
    if (r.ok) return json({ ok: true, mode: "test", to: testEmail });
    const err = await r.json().catch(() => ({}));
    return json({ ok: false, error: err }, 500);
  }

  // Modo broadcast — todos os subscritores activos
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_waitlist?select=email&unsubscribed=eq.false&order=created_at.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const rows: { email: string }[] = await listRes.json();

  if (rows.length === 0) return json({ ok: true, sent: 0, message: "Nenhum subscritor activo." });

  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const row of rows) {
    const token = await unsubToken(row.email);
    const emailHtml = buildEmail(subject, html, row.email, token);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [row.email], subject, html: emailHtml }),
    });
    if (r.ok) {
      results.push({ email: row.email, ok: true });
    } else {
      const err = await r.json().catch(() => ({}));
      results.push({ email: row.email, ok: false, error: JSON.stringify(err) });
    }
    await new Promise(res => setTimeout(res, 200));
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  return json({ ok: true, total: rows.length, sent, failed });
});
