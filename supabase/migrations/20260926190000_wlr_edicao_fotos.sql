-- Edições anteriores: além da foto do grupo (wlr_edicoes.foto, sempre a primeira), uma galeria de outras fotos.
create table if not exists wlr_edicao_fotos (
  id bigserial primary key,
  ano int not null references wlr_edicoes(ano) on update cascade on delete cascade,
  ordem int not null default 0,
  foto text not null,
  criado_em timestamptz not null default now()
);
alter table wlr_edicao_fotos enable row level security;
create index if not exists wlr_edicao_fotos_ano on wlr_edicao_fotos(ano, ordem, id);

create or replace function wlr__confraria(p_com_foto boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'texto', (select confraria_texto from wlr_config where id = 1),
    'playlist', (select playlist_url from wlr_config where id = 1),
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('ano', e.ano, 'data', e.data, 'local', e.local, 'texto', e.texto,
        'vinhos', e.vinhos, 'tem_foto', e.foto is not null,
        'n_fotos', (select count(*) from wlr_edicao_fotos f where f.ano = e.ano)) order by e.ano desc) from wlr_edicoes e), '[]'::jsonb));
$$;
revoke execute on function wlr__confraria(boolean) from public, anon, authenticated;

create or replace function wlr_p_edicao_fotos(p_id uuid, p_ano int) returns setof text
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return query select foto from wlr_edicao_fotos where ano = p_ano order by ordem, id;
end $$;

create or replace function wlr_admin_edicao_fotos(p_token text, p_ano int) returns table(id bigint, foto text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select f.id, f.foto from wlr_edicao_fotos f where f.ano = p_ano order by f.ordem, f.id;
end $$;

create or replace function wlr_admin_edicao_foto_add(p_token text, p_ano int, p_foto text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  perform wlr_admin_check(p_token);
  if not exists (select 1 from wlr_edicoes where ano = p_ano) then raise exception 'Salve a edição antes de juntar fotos'; end if;
  if coalesce(p_foto, '') !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'Foto inválida'; end if;
  if length(p_foto) > 3000000 then raise exception 'Foto grande demais'; end if;
  insert into wlr_edicao_fotos (ano, ordem, foto)
  values (p_ano, coalesce((select max(ordem) + 1 from wlr_edicao_fotos where ano = p_ano), 0), p_foto) returning id into v;
  return v;
end $$;

create or replace function wlr_admin_edicao_foto_rm(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_edicao_fotos where id = p_id;
end $$;
