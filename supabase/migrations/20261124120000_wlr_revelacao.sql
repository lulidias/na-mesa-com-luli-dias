-- Premiação da MFLD: passo da revelação no telão, comandado pelo controle remoto (celular)
create table if not exists wlr_revelacao (id int primary key default 1 check (id = 1), passo int not null default 0, atualizado timestamptz default now());
insert into wlr_revelacao (id, passo) values (1, 0) on conflict do nothing;
alter table wlr_revelacao enable row level security;

create or replace function wlr_revelacao_get(p_token text) returns int
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return (select passo from wlr_revelacao where id = 1);
end $$;

create or replace function wlr_revelacao_set(p_token text, p_passo int) returns int
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_revelacao set passo = greatest(0, p_passo), atualizado = now() where id = 1;
  return p_passo;
end $$;

grant execute on function wlr_revelacao_get(text), wlr_revelacao_set(text, int) to anon, authenticated;

-- vinhos aprovados para o telão da premiação (o site tem acesso restrito: só com o token do organizador/conselho)
create or replace function wlr_revelacao_vinhos(p_token text)
returns table(id uuid, vinho text, safra text, formato text, tipo text, pais text, foto_url text, membros text[])
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query
    select g.id, g.vinho, g.safra, g.formato, g.tipo, g.pais, g.foto_url,
           coalesce((select array_agg(p.nome order by p.nome) from wlr_garrafa_membros m
                     join wlr_participantes p on p.id = m.participante_id where m.garrafa_id = g.id), '{}')
    from wlr_garrafas g where wlr_situacao(g) = 'aprovado' order by g.vinho;
end $$;
grant execute on function wlr_revelacao_vinhos(text) to anon, authenticated;
