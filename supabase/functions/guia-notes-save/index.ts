// Edge Function: guia-notes-save
// Cria ou actualiza uma nota de "Amigo da Casa" no Supabase.
//
// POST { secret, slug, guide, ...campos }  → upsert
// DELETE { secret, slug, guide }           → elimina

const BROADCAST_SECRET  = Deno.env.get("BROADCAST_SECRET") ?? "";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }

  const { secret, slug, guide, ...fields } = body as Record<string, string | boolean>;

  if (!BROADCAST_SECRET || secret !== BROADCAST_SECRET) return json({ error: "nao_autorizado" }, 401);
  if (!slug || !guide) return json({ error: "slug_e_guide_obrigatorios" }, 400);

  if (req.method === "DELETE") {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurant_notes?slug=eq.${encodeURIComponent(String(slug))}&guide=eq.${encodeURIComponent(String(guide))}`,
      { method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    return r.ok ? json({ ok: true }) : json({ error: "delete_failed" }, 500);
  }

  if (req.method === "POST") {
    const payload = {
      slug, guide,
      luli_knows:    fields.luli_knows ?? true,
      luli_note:     fields.luli_note     || null,
      chef_name:     fields.chef_name     || null,
      contact_name:  fields.contact_name  || null,
      direct_phone:  fields.direct_phone  || null,
      luli_story:    fields.luli_story    || null,
      favorite_dish: fields.favorite_dish || null,
      chef_photo_url: fields.chef_photo_url || null,
      luli_photo_url: fields.luli_photo_url || null,
      updated_at:    new Date().toISOString(),
    };

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurant_notes`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await r.json().catch(() => ({}));
    return r.ok ? json({ ok: true, data }) : json({ error: data }, 500);
  }

  return json({ error: "method_not_allowed" }, 405);
});
