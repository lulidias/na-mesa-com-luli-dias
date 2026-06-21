// Edge Function: guia-unsubscribe
// Cancela subscrição de newsletter via link de email.
// GET ?email=...&token=... → marca unsubscribed=true e redireciona para página de confirmação

const BROADCAST_SECRET = Deno.env.get("BROADCAST_SECRET") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function verifyToken(email: string, token: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(BROADCAST_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return expected === token;
}

const html = (msg: string) => new Response(
  `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Luli Dias</title>
  <style>body{background:#F7F3EE;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:Arial,sans-serif}
  .box{max-width:440px;text-align:center;padding:48px 32px}
  h1{font-family:Georgia,serif;font-size:28px;font-weight:400;letter-spacing:8px;text-transform:uppercase;color:#1A1A1A;margin:0 0 8px}
  .sub{font-size:8px;letter-spacing:5px;text-transform:uppercase;color:#5A5A5A;margin-bottom:32px}
  .line{border:none;border-top:1px solid #B8922A;width:40px;margin:0 auto 32px}
  p{font-size:14px;color:#5A5045;line-height:1.8;margin:0}
  a{color:#B8922A}</style></head>
  <body><div class="box">
  <h1>Luli Dias</h1>
  <div class="sub">Restaurants &amp; Hotels</div>
  <hr class="line">
  <p>${msg}</p>
  </div></body></html>`,
  { headers: { "Content-Type": "text/html;charset=utf-8" } }
);

Deno.serve(async (req) => {
  const url   = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (!email || !token) return html("Link inválido.");

  const valid = await verifyToken(email, token);
  if (!valid) return html("Link inválido ou expirado.");

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/guia_waitlist?email=eq.${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ unsubscribed: true }),
    }
  );

  if (!r.ok) return html("Ocorreu um erro. Por favor envia um email para lulidias@me.com.");

  return html(
    `Subscrição cancelada com sucesso.<br><br>Deixas de receber a newsletter do Luli Dias.<br><br>` +
    `<a href="https://lulidias.com">Voltar ao guia →</a>`
  );
});
