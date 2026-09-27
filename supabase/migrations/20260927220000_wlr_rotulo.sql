-- leitura do rótulo: o confrade fotografa, a IA lê e a carta usa a foto padrão (Vivino) do vinho exato
create policy "wlr upload rotulo" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'wlr' and (storage.foldername(name))[1] = 'rotulos');

alter table wlr_garrafas add column if not exists rotulo_url text;   -- a foto que o confrade tirou (comprovante; não aparece na carta)
alter table wlr_garrafas add column if not exists vivino_id bigint;

-- depois de salvar a garrafa: guarda a foto do rótulo e, se o confrade confirmou "é este", a foto padrão
create or replace function wlr_set_rotulo_garrafa(p_participante uuid, p_garrafa uuid, p_rotulo_url text, p_foto_url text, p_vivino bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from wlr_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Só quem leva a garrafa pode definir o rótulo';
  end if;
  update wlr_garrafas set
    rotulo_url = coalesce(nullif(trim(coalesce(p_rotulo_url, '')), ''), rotulo_url),
    foto_url = case when nullif(trim(coalesce(p_foto_url, '')), '') is not null then trim(p_foto_url) else foto_url end,
    foto_ok = case when nullif(trim(coalesce(p_foto_url, '')), '') is not null then true else foto_ok end,
    vivino_id = coalesce(p_vivino, vivino_id)
  where id = p_garrafa;
end $$;
grant execute on function wlr_set_rotulo_garrafa(uuid, uuid, text, text, bigint) to anon, authenticated;
