-- Confra das Confras — aprovação de novos confrades pelos presidentes das confrarias

alter table public.confras_participantes add column if not exists aprovado boolean;
alter table public.confras_participantes add column if not exists aprovado_por text;

-- todos os já cadastrados são conhecidos: entram aprovados
update public.confras_participantes set aprovado = true where aprovado is null;

create table if not exists public.confras_presidentes (
  slug text primary key,
  confraria text not null,
  nome text not null,
  email text
);
alter table public.confras_presidentes enable row level security;
revoke all on public.confras_presidentes from anon, authenticated;

insert into public.confras_presidentes (slug, confraria, nome, email) values
  ('commanderie', 'Commanderie de Bordeaux', 'Tito Dias', 'titodiaslima@gmail.com'),
  ('porquinho', 'Confraria do Porquinho', 'Alberto Porpino', 'aaporpino@hotmail.com'),
  ('wine-lovers', 'Wine Lovers Recife', 'Fernando Gurgel', 'fernandovgurgel@gmail.com'),
  ('confra-wine', 'Confra Wine Recife', 'Marcelo Sandes', null),
  ('over20', 'Over 20', 'Leo', null)
on conflict (slug) do nothing;

-- presidente aprova por link assinado (chave = md5(id + confraria + token))
create or replace function public.confras_aprovar(p_participante uuid, p_confraria text, p_chave text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if p_chave is distinct from md5(p_participante::text || p_confraria ||
      (select admin_token from confras_config where id = 1)) then
    raise exception 'Link de aprovação inválido';
  end if;
  update confras_participantes
  set aprovado = true,
      aprovado_por = coalesce((select confraria from confras_presidentes where slug = p_confraria), p_confraria)
  where id = p_participante
  returning nome into v_nome;
  if v_nome is null then raise exception 'Cadastro não encontrado'; end if;
  return v_nome;
end $$;
grant execute on function public.confras_aprovar(uuid, text, text) to anon, authenticated;

-- novo cadastro → e-mail de aprovação para o presidente de cada confraria marcada
create or replace function public.confras_trg_pede_aprovacao() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_slug text; v_pres record; v_token text;
begin
  select admin_token into v_token from confras_config where id = 1;
  new.aprovado := null;
  foreach v_slug in array new.confrarias loop
    select * into v_pres from confras_presidentes where slug = v_slug and email is not null;
    if found and lower(v_pres.email) is distinct from lower(coalesce(new.email, '')) then
      perform confras_email_enqueue('aprovacao', v_pres.email, jsonb_build_object(
        'presidente', v_pres.nome,
        'novato', new.nome,
        'confraria', v_pres.confraria,
        'participante_id', new.id,
        'chave', md5(new.id::text || v_slug || v_token),
        'slug', v_slug));
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists confras_pede_aprovacao on public.confras_participantes;
create trigger confras_pede_aprovacao
  before insert on public.confras_participantes
  for each row execute function public.confras_trg_pede_aprovacao();
