-- Ejecutar DESPUÉS de crear las dos cuentas en Authentication > Users.
-- Ambos usuarios deben existir. Si falta alguno, no se modifica la lista.
begin;
do $$
begin
 if (select count(*) from auth.users where lower(email) in ('mjrb11@hotmail.com','luis21aro@gmail.com')) <> 2 then
  raise exception 'Primero crea las dos cuentas en Authentication > Users.';
 end if;
end $$;
insert into public.household_members(user_id,person)
select id,case when lower(email)='luis21aro@gmail.com' then 'luis' else 'pareja' end
from auth.users where lower(email) in ('mjrb11@hotmail.com','luis21aro@gmail.com')
on conflict(user_id) do update set person=excluded.person;
commit;
-- Debe mostrar exactamente dos filas.
select m.person,u.email from public.household_members m join auth.users u on u.id=m.user_id;
