-- Eventos da confraria (além da Magnum Fest, que continua em wlr_edicoes) e o álbum coletivo.
-- Os 4 tipos: magnum (wlr_edicoes), paralela, ordinario, velhinhos.
create table if not exists wlr_eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('paralela', 'ordinario', 'velhinhos')),
  data date,
  titulo text,
  local text,
  texto text,
  vinhos text,                 -- "SIGLA - Vinho safra", uma por linha (como nas edições)
  vinhos_dados jsonb,          -- classificação (país, região, tipo, uva…) para o BI
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
alter table wlr_eventos enable row level security;

-- álbum coletivo: ref = 'mf-2025' (Magnum Fest do ano) ou 'ev-<uuid>' (outro evento)
-- arquivos no bucket PRIVADO wlr-album; o worker gera links temporários só para quem tem sessão
create table if not exists wlr_album (
  id bigserial primary key,
  ref text not null,
  path text not null unique,
  thumb text not null,
  autor_id uuid references wlr_participantes(id) on delete set null,
  autor_nome text,
  legenda text,
  criado_em timestamptz not null default now()
);
alter table wlr_album enable row level security;
create index if not exists wlr_album_ref on wlr_album(ref, criado_em);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wlr-album', 'wlr-album', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

-- lista de eventos para os membros (sem fotos; as fotos vêm pelo worker)
create or replace function wlr_p_eventos(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'data', e.data, 'titulo', e.titulo, 'local', e.local,
        'texto', e.texto, 'vinhos', e.vinhos, 'dados', coalesce(e.vinhos_dados, '[]'::jsonb),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'ev-' || e.id)) order by e.data desc nulls last, e.criado_em desc)
      from wlr_eventos e), '[]'::jsonb),
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', m.ano, 'data', m.data, 'local', m.local,
        'n', coalesce(jsonb_array_length(m.vinhos_dados), 0), 'tem_foto', m.foto is not null,
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'mf-' || m.ano)) order by m.ano desc)
      from wlr_edicoes m), '[]'::jsonb),
    'fotos_por_ref', coalesce((select jsonb_object_agg(ref, n) from (select ref, count(*) n from wlr_album group by ref) x), '{}'::jsonb));
end $$;

-- painel: eventos
create or replace function wlr_admin_eventos(p_token text) returns setof wlr_eventos
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select * from wlr_eventos order by data desc nulls last, criado_em desc;
end $$;

create or replace function wlr_admin_evento_salvar(p_token text, p_evento uuid, p_tipo text, p_data date, p_titulo text, p_local text,
  p_texto text, p_vinhos text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; v_quem text;
begin
  v_quem := wlr_admin_check(p_token);
  if p_tipo not in ('paralela', 'ordinario', 'velhinhos') then raise exception 'Tipo de evento inválido'; end if;
  if p_evento is null then insert into wlr_eventos (tipo) values (p_tipo) returning id into v; else v := p_evento; end if;
  update wlr_eventos set tipo = p_tipo, data = p_data, titulo = nullif(trim(coalesce(p_titulo, '')), ''), local = nullif(trim(coalesce(p_local, '')), ''),
    texto = nullif(trim(coalesce(p_texto, '')), ''), vinhos = nullif(trim(coalesce(p_vinhos, '')), ''), atualizado_em = now(), atualizado_por = v_quem
  where id = v;
  return v;
end $$;

create or replace function wlr_admin_evento_apagar(p_token text, p_evento uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  if exists (select 1 from wlr_album where ref = 'ev-' || p_evento) then raise exception 'Apague antes as fotos do álbum deste evento'; end if;
  delete from wlr_eventos where id = p_evento;
end $$;
