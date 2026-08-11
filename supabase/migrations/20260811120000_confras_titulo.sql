-- Confra das Confras — padronização de maiúsculas/minúsculas (Title Case)
-- Regra: entradas TODAS MAIÚSCULAS ou todas minúsculas são normalizadas;
-- texto misto (digitado com capricho) é respeitado. Partículas ficam minúsculas.

create or replace function public.confras_titulo(t text) returns text
language plpgsql immutable as $$
declare w text; saida text[] := '{}'; i int := 0;
  particulas text[] := array['de','da','do','das','dos','e','di','del','della','du','la','le','les','van','von','em','a','o'];
begin
  if t is null or trim(t) = '' then return t; end if;
  t := trim(regexp_replace(t, '\s+', ' ', 'g'));
  if t <> upper(t) and t <> lower(t) then return t; end if;  -- misto: respeita como digitado
  foreach w in array string_to_array(lower(t), ' ') loop
    i := i + 1;
    if i > 1 and w = any(particulas) then
      saida := saida || w;
    elsif w like 'd''%' and length(w) > 2 then
      saida := saida || ('d''' || upper(substr(w, 3, 1)) || substr(w, 4));
    else
      saida := saida || (upper(substr(w, 1, 1)) || substr(w, 2));
    end if;
  end loop;
  return array_to_string(saida, ' ');
end $$;

-- daqui em diante: normaliza na entrada, em qualquer caminho (site, admin, SQL)
create or replace function public.confras_trg_titulo_participante() returns trigger
language plpgsql as $$
begin
  new.nome := public.confras_titulo(new.nome);
  return new;
end $$;
drop trigger if exists confras_aa_titulo on public.confras_participantes;
create trigger confras_aa_titulo
  before insert or update of nome on public.confras_participantes
  for each row execute function public.confras_trg_titulo_participante();

create or replace function public.confras_trg_titulo_garrafa() returns trigger
language plpgsql as $$
begin
  new.vinho := public.confras_titulo(new.vinho);
  new.produtor := public.confras_titulo(new.produtor);
  new.regiao := public.confras_titulo(new.regiao);
  return new;
end $$;
drop trigger if exists confras_aa_titulo_g on public.confras_garrafas;
create trigger confras_aa_titulo_g
  before insert or update of vinho, produtor, regiao on public.confras_garrafas
  for each row execute function public.confras_trg_titulo_garrafa();

-- corrige o acervo atual (só os todos-maiúsculos / todos-minúsculos)
update public.confras_participantes set nome = public.confras_titulo(nome)
  where nome = upper(nome) or nome = lower(nome);
update public.confras_garrafas set vinho = public.confras_titulo(vinho)
  where vinho = upper(vinho) or vinho = lower(vinho);
update public.confras_garrafas set produtor = public.confras_titulo(produtor)
  where produtor is not null and (produtor = upper(produtor) or produtor = lower(produtor));
update public.confras_garrafas set regiao = public.confras_titulo(regiao)
  where regiao is not null and (regiao = upper(regiao) or regiao = lower(regiao));
