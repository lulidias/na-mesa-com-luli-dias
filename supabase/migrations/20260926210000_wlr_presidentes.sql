-- Página da confraria: galeria dos presidentes (foto no banco, só membros; editável no painel).
create table if not exists wlr_presidentes (
  id bigserial primary key,
  nome text not null,
  periodo text,                -- como aparece: "Da fundação a 2025", "Desde 2026"
  ordem int not null default 0, -- 1 = o primeiro presidente
  foto text,
  atualizado_em timestamptz not null default now()
);
alter table wlr_presidentes enable row level security;

create or replace function wlr_p_presidentes(p_id uuid) returns table(id bigint, nome text, periodo text, tem_foto boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return query select x.id, x.nome, x.periodo, x.foto is not null from wlr_presidentes x order by x.ordem desc, x.id desc;
end $$;

create or replace function wlr_p_presidente_foto(p_id uuid, p_pres bigint) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return (select foto from wlr_presidentes where id = p_pres);
end $$;

create or replace function wlr_admin_presidentes(p_token text) returns table(id bigint, nome text, periodo text, ordem int, foto text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select x.id, x.nome, x.periodo, x.ordem, x.foto from wlr_presidentes x order by x.ordem, x.id;
end $$;

-- p_foto: null = mantém; '' = remove; data URL = troca. p_pres null = novo.
create or replace function wlr_admin_presidente_salvar(p_token text, p_pres bigint, p_nome text, p_periodo text, p_ordem int, p_foto text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  perform wlr_admin_check(p_token);
  if nullif(trim(coalesce(p_nome, '')), '') is null then raise exception 'Informe o nome'; end if;
  if p_foto is not null and p_foto <> '' and p_foto !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'Foto inválida'; end if;
  if p_foto is not null and length(p_foto) > 3000000 then raise exception 'Foto grande demais'; end if;
  if p_pres is null then
    insert into wlr_presidentes (nome, periodo, ordem, foto) values (trim(p_nome), nullif(trim(coalesce(p_periodo, '')), ''),
      coalesce(p_ordem, (select coalesce(max(ordem), 0) + 1 from wlr_presidentes)), nullif(p_foto, '')) returning id into v;
  else
    update wlr_presidentes set nome = trim(p_nome), periodo = nullif(trim(coalesce(p_periodo, '')), ''), ordem = coalesce(p_ordem, ordem),
      foto = case when p_foto is null then foto else nullif(p_foto, '') end, atualizado_em = now() where id = p_pres returning id into v;
  end if;
  return v;
end $$;

create or replace function wlr_admin_presidente_apagar(p_token text, p_pres bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_presidentes where id = p_pres;
end $$;

insert into wlr_presidentes (nome, periodo, ordem)
select * from (values ('Álvaro Mendonça Neto', 'Da fundação a 2025', 1), ('Fernando Gurgel', 'Desde 2026', 2)) v(n, p, o)
where not exists (select 1 from wlr_presidentes);
