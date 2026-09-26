-- Comprobaciones opcionales de configuración. Solo lectura.
select id,version,updated_at from public.household;
select m.person,u.email from public.household_members m join auth.users u on u.id=m.user_id;
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('household','household_members','household_audit');
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='receipts';
select version,actor,changed_at,changes from public.household_audit order by id desc limit 20;
