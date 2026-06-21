// Edge Function: guia-notes
// Devolve as notas editoriais do Luli para um guia específico.
// GET ?guide=portugal-guia  →  array de restaurant_notes

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url   = new URL(req.url);
  const guide = url.searchParams.get("guide") ?? "";

  const query = guide
    ? `guide=eq.${encodeURIComponent(guide)}&select=slug,guide,luli_note,chef_name,luli_knows,luli_story,luli_photo_url,chef_photo_url,favorite_dish,updated_at`
    : `select=slug,guide,luli_note,chef_name,luli_knows,luli_story,luli_photo_url,chef_photo_url,favorite_dish,updated_at`;

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurant_notes?${query}&order=updated_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  const data = await r.json();
  return new Response(JSON.stringify(data), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
