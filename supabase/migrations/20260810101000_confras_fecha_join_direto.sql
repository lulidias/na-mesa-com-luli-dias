-- entrada direta em garrafa desativada — agora só via pedido aprovado pelo dono
revoke execute on function public.confras_join_garrafa(uuid, uuid) from anon, authenticated;
