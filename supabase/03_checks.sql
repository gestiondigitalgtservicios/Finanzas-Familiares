-- Comprobaciones opcionales de configuración. Solo lectura.
-- Ejecuta este archivo en el MISMO proyecto cuya URL usa la app.
-- Las dos filas de abajo deben indicar cuenta_creada=true y miembro_autorizado=true.
select expected.email,
       u.id is not null as cuenta_creada,
       m.user_id is not null as miembro_autorizado,
       m.person,
       u.email_confirmed_at is not null as correo_confirmado
from (values ('luis21aro@gmail.com'), ('mjrb11@hotmail.com')) as expected(email)
left join auth.users u on lower(u.email)=expected.email
left join public.household_members m on m.user_id=u.id
order by expected.email;
-- La siguiente consulta debe mostrar una fila con id=1.
select id,version,updated_at from public.household;
select m.person,u.email from public.household_members m join auth.users u on u.id=m.user_id;
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('household','household_members','household_audit');
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='receipts';
select version,actor,changed_at,changes from public.household_audit order by id desc limit 20;
