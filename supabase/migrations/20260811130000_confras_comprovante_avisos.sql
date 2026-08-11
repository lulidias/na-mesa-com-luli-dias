-- Confra das Confras — avisos automáticos a cada upload de comprovante:
-- (1) confrade recebe "comprovante recebido, em análise"
-- (2) Cristiano (recebedor do Pix) recebe o comprovante para conferir no extrato

create or replace function public.confras_trg_comprovante() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.comprovante_url is not null and new.comprovante_url is distinct from old.comprovante_url then
    if new.email is not null then
      perform confras_email_enqueue('comprovante-recebido', new.email, jsonb_build_object(
        'nome', new.nome, 'participante_id', new.id));
    end if;
    perform confras_email_enqueue('comprovante-cris', 'Crisfin@terra.com.br', jsonb_build_object(
      'nome', new.nome, 'url', new.comprovante_url, 'participante_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists confras_comprovante_avisos on public.confras_participantes;
create trigger confras_comprovante_avisos
  after update of comprovante_url on public.confras_participantes
  for each row execute function public.confras_trg_comprovante();
