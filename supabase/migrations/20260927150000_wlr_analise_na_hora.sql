-- Análise automática na hora em que a garrafa é registrada (antes: só a cada 5 min, pelo cron).
-- O segredo do worker entra no lugar de __WLR_SECRET__ ao aplicar (o repositório é público).
create or replace function wlr__analisa_ja() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://saotncritqxuchsvvnzi.supabase.co/functions/v1/wlr-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-wlr-secret', '__WLR_SECRET__'),
    body := jsonb_build_object('task', 'analise', 'garrafa', new.id));
  return new;
end $$;
revoke execute on function wlr__analisa_ja() from public, anon, authenticated;

drop trigger if exists wlr_garrafa_analisa on wlr_garrafas;
create trigger wlr_garrafa_analisa after insert on wlr_garrafas for each row execute function wlr__analisa_ja();
