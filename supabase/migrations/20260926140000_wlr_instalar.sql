-- Magnum Fest: ícone na tela de início sem pedir o telefone de novo.
-- No iPhone o app da tela de início tem armazenamento próprio (não enxerga o do Safari). Por isso o botão
-- "Instalar no celular" gera um token de uso único (30 min) que vai na URL; o app, ao abrir pela 1ª vez,
-- troca o token pela sessão e já registra o próprio aparelho como aprovado.
create table if not exists wlr_tokens_instalar (
  token text primary key,
  participante_id uuid not null references wlr_participantes(id) on delete cascade,
  expira timestamptz not null,
  usado_em timestamptz
);
alter table wlr_tokens_instalar enable row level security;

create or replace function wlr_token_instalar(p_id uuid, p_disp text) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  -- só quem já está num aparelho aprovado gera o token
  if not exists (select 1 from wlr_dispositivos where participante_id = p_id and disp_hash = wlr_hash(p_disp) and aprovado) then
    raise exception 'Aparelho não aprovado — entre de novo com o seu WhatsApp';
  end if;
  v_token := encode(extensions.gen_random_bytes(18), 'hex');
  insert into wlr_tokens_instalar (token, participante_id, expira) values (v_token, p_id, now() + interval '30 minutes');
  return v_token;
end $$;

create or replace function wlr_usar_token_instalar(p_token text, p_disp text, p_aparelho text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v wlr_tokens_instalar;
begin
  select * into v from wlr_tokens_instalar where token = p_token;
  if v.token is null or v.usado_em is not null or v.expira < now() or length(coalesce(p_disp, '')) < 20 then return null; end if;
  update wlr_tokens_instalar set usado_em = now() where token = p_token;
  insert into wlr_dispositivos (participante_id, disp_hash, aparelho, aprovado, aprovado_em, ultimo_uso)
  values (v.participante_id, wlr_hash(p_disp), left(coalesce(p_aparelho, 'App na tela de início'), 80), true, now(), now())
  on conflict (participante_id, disp_hash) do update set aprovado = true, ultimo_uso = now();
  return v.participante_id;
end $$;

-- abrir o app num aparelho aprovado não pede nada: o segredo do aparelho basta
create or replace function wlr_sessao_do_aparelho(p_disp text) returns uuid
language sql security definer set search_path = public as $$
  update wlr_dispositivos set ultimo_uso = now()
  where disp_hash = wlr_hash(p_disp) and aprovado and length(coalesce(p_disp, '')) >= 20
  returning participante_id;
$$;
