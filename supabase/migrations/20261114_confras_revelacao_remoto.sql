-- Controle remoto da tela de revelação (celular comanda, TV obedece)
create table if not exists confras_revelacao (
  id int primary key default 1,
  passo int not null default 0,
  atualizado timestamptz default now()
);
insert into confras_revelacao (id, passo) values (1, 0) on conflict (id) do nothing;
alter table confras_revelacao enable row level security;

create or replace function confras_revelacao_get(p_token text)
returns int language plpgsql security definer set search_path to 'public'
as $fn$
begin
  perform confras_admin_check(p_token);
  return (select passo from confras_revelacao where id = 1);
end $fn$;

create or replace function confras_revelacao_set(p_token text, p_passo int)
returns void language plpgsql security definer set search_path to 'public'
as $fn$
begin
  perform confras_admin_check(p_token);
  update confras_revelacao set passo = greatest(0, p_passo), atualizado = now() where id = 1;
end $fn$;
