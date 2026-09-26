-- ENTRE DOS · 01_schema.sql
-- Ejecutar en el SQL Editor de un proyecto Supabase nuevo.
-- No contiene contraseñas ni claves secretas. No borra datos existentes.
begin;
create table if not exists public.household_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 person text not null unique check (person in ('luis','pareja'))
);
alter table public.household_members enable row level security;
create or replace function public.is_household_member() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.household_members where user_id = auth.uid());
$$;
revoke all on function public.is_household_member() from public;
grant execute on function public.is_household_member() to authenticated;
drop policy if exists members_read on public.household_members;
create policy members_read on public.household_members for select to authenticated using (public.is_household_member());
revoke all on public.household_members from anon, authenticated;
grant select on public.household_members to authenticated;

create table if not exists public.household (
 id integer primary key check (id=1),
 data jsonb not null,
 version integer not null default 0,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.household enable row level security;
insert into public.household(id,data) values (1,'{"accounts":[],"goals":[],"loans":[],"bills":[],"entries":[],"budgets":[],"names":{"luis":"Luis","pareja":"Jaquelín"}}'::jsonb) on conflict(id) do nothing;
drop policy if exists household_read on public.household;
create policy household_read on public.household for select to authenticated using (public.is_household_member());
revoke all on public.household from anon, authenticated;
grant select on public.household to authenticated;

create table if not exists public.household_audit (
 id bigint generated always as identity primary key,
 version integer not null,
 actor uuid not null references auth.users(id),
 changed_at timestamptz not null default now(),
 changes jsonb not null
);
alter table public.household_audit enable row level security;
drop policy if exists audit_read on public.household_audit;
create policy audit_read on public.household_audit for select to authenticated using (public.is_household_member());
revoke all on public.household_audit from anon, authenticated;
grant select on public.household_audit to authenticated;

-- Reglas de dinero también en el servidor. Montos enteros, en centavos.
create or replace function public.validate_household(d jsonb) returns void
language plpgsql set search_path = '' as $$
declare k text; r jsonb; entry_data jsonb; g jsonb; n numeric; reserved_amount numeric; balance numeric; debt numeric; ids text[] := '{}';
begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>4000000 then raise exception 'INVALID_DATA'; end if;
 if coalesce(length(trim(d->'names'->>'luis')),0) not between 1 and 30 or coalesce(length(trim(d->'names'->>'pareja')),0) not between 1 and 30 then raise exception 'INVALID_NAMES'; end if;
 foreach k in array array['accounts','goals','loans','bills','entries','budgets'] loop
  if jsonb_typeof(d->k) is distinct from 'array' then raise exception 'INVALID_COLLECTION'; end if;
  for r in select value from jsonb_array_elements(d->k) loop
   if coalesce(length(r->>'id'),0) not between 1 and 100 or (r->>'id')=any(ids) then raise exception 'INVALID_ID'; end if;
   ids:=array_append(ids,r->>'id');
   if coalesce(r->>'owner','') not in ('luis','pareja','compartido') then raise exception 'INVALID_OWNER'; end if;
   if k<>'budgets' and coalesce(length(trim(r->>'name')),0) not between 1 and 100 then raise exception 'INVALID_NAME'; end if;
   n:=case when k in ('accounts','loans') then (r->>'opening')::numeric when k='goals' then (r->>'target')::numeric else (r->>'amount')::numeric end;
   if n is null or n<>trunc(n) or n<0 or n>1000000000000 or (k not in ('accounts','loans') and n=0) then raise exception 'INVALID_AMOUNT'; end if;
   if k='loans' and (coalesce(r->>'direction','') not in ('owe','owed') or (r->>'installment')::numeric<0 or (r->>'installment')::numeric<>trunc((r->>'installment')::numeric)) then raise exception 'INVALID_LOAN'; end if;
   if k='bills' then
    if coalesce((r->>'day')::integer,0) not between 1 and 31 or coalesce(r->>'start','')!~'^\d{4}-\d{2}$' or not exists(select 1 from jsonb_array_elements(d->'accounts') a where a->>'id'=r->>'account') then raise exception 'INVALID_BILL'; end if;
   end if;
  end loop;
 end loop;
 for entry_data in select value from jsonb_array_elements(d->'entries') loop
  if coalesce(entry_data->>'kind','') not in ('income','expense','transfer','saving','release','loan_payment','loan_received','loan_given','loan_recovery') then raise exception 'INVALID_KIND'; end if;
  if not exists(select 1 from jsonb_array_elements(d->'accounts') a where a->>'id'=entry_data->>'account') then raise exception 'INVALID_ACCOUNT'; end if;
  if coalesce(entry_data->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or (entry_data->>'date')::date > (now() at time zone 'America/Guatemala')::date then raise exception 'INVALID_DATE'; end if;
  if entry_data->>'kind'='transfer' and (entry_data->>'account'=entry_data->>'to' or not exists(select 1 from jsonb_array_elements(d->'accounts') a where a->>'id'=entry_data->>'to')) then raise exception 'INVALID_TRANSFER'; end if;
  if entry_data->>'kind' in ('saving','release') and coalesce(entry_data->>'goal','')='' then raise exception 'MISSING_GOAL'; end if;
  if coalesce(entry_data->>'goal','')<>'' and (entry_data->>'kind' not in ('saving','release','expense') or not exists(select 1 from jsonb_array_elements(d->'goals') a where a->>'id'=entry_data->>'goal')) then raise exception 'INVALID_GOAL'; end if;
  if entry_data->>'kind' like 'loan_%' then
   if not exists(select 1 from jsonb_array_elements(d->'loans') a where a->>'id'=entry_data->>'loan' and a->>'direction'=case when entry_data->>'kind' in ('loan_payment','loan_received') then 'owe' else 'owed' end) then raise exception 'INVALID_LOAN'; end if;
  end if;
  n:=coalesce((entry_data->>'interest')::numeric,0);
  if n<0 or n> (entry_data->>'amount')::numeric or n<>trunc(n) then raise exception 'INVALID_INTEREST'; end if;
  if coalesce(entry_data->>'bill','')<>'' and (entry_data->>'kind'<>'expense' or not exists(select 1 from jsonb_array_elements(d->'bills') a where a->>'id'=entry_data->>'bill') or coalesce(entry_data->>'period','')!~'^\d{4}-\d{2}$') then raise exception 'INVALID_BILL_PAYMENT'; end if;
  if coalesce(entry_data->>'photo','')<>'' and (entry_data->>'photo' !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpeg|png|webp)$') then raise exception 'INVALID_PHOTO'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(d->'entries') e where coalesce(e->>'bill','')<>'' group by e->>'bill',e->>'period' having count(*)>1) then raise exception 'DUPLICATE_BILL_PAYMENT'; end if;
 for r in select value from jsonb_array_elements(d->'accounts') loop
  select (r->>'opening')::numeric + coalesce(sum(case when e->>'account'=r->>'id' then case when e->>'kind' in ('income','loan_received','loan_recovery') then (e->>'amount')::numeric when e->>'kind' in ('expense','transfer','loan_payment','loan_given') then -(e->>'amount')::numeric else 0 end else 0 end + case when e->>'kind'='transfer' and e->>'to'=r->>'id' then (e->>'amount')::numeric else 0 end),0) into balance from jsonb_array_elements(d->'entries') e;
  reserved_amount:=0;
  for g in select value from jsonb_array_elements(d->'goals') loop
   select coalesce(sum(case when e->>'kind'='saving' then (e->>'amount')::numeric when e->>'kind' in ('release','expense') then -(e->>'amount')::numeric else 0 end),0) into n from jsonb_array_elements(d->'entries') e where e->>'account'=r->>'id' and e->>'goal'=g->>'id';
   if n<0 then raise exception 'INSUFFICIENT_GOAL'; end if;
   reserved_amount:=reserved_amount+n;
  end loop;
  if balance<0 or reserved_amount>balance then raise exception 'INSUFFICIENT_BALANCE'; end if;
 end loop;
 for r in select value from jsonb_array_elements(d->'loans') loop
  select (r->>'opening')::numeric + coalesce(sum(case when e->>'kind' in ('loan_received','loan_given') then (e->>'amount')::numeric else -((e->>'amount')::numeric-coalesce((e->>'interest')::numeric,0)) end),0) into debt from jsonb_array_elements(d->'entries') e where e->>'loan'=r->>'id';
  if debt<0 then raise exception 'LOAN_OVERPAYMENT'; end if;
 end loop;
end;
$$;
revoke all on function public.validate_household(jsonb) from public, anon, authenticated;

create or replace function public.save_household(new_data jsonb, expected_version integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare old_data jsonb; old_version integer; changes jsonb := '[]'; k text;
begin
 if not public.is_household_member() then raise exception 'ACCESS_DENIED'; end if;
 select data,version into old_data,old_version from public.household where id=1 for update;
 if old_version is distinct from expected_version then raise exception 'CONFLICT'; end if;
 perform public.validate_household(new_data);
 foreach k in array array['accounts','goals','loans','bills','entries','budgets'] loop
  select changes || coalesce(jsonb_agg(jsonb_build_object('collection',k,'id',coalesce(o.r->>'id',n.r->>'id'),'before',o.r,'after',n.r)), '[]'::jsonb) into changes
   from jsonb_array_elements(old_data->k) o(r) full join jsonb_array_elements(new_data->k) n(r) on o.r->>'id'=n.r->>'id' where o.r is distinct from n.r;
 end loop;
 if old_data->'names' is distinct from new_data->'names' then changes:=changes || jsonb_build_array(jsonb_build_object('collection','names','before',old_data->'names','after',new_data->'names')); end if;
 update public.household set data=new_data,version=old_version+1,updated_at=now(),updated_by=auth.uid() where id=1;
 insert into public.household_audit(version,actor,changes) values(old_version+1,auth.uid(),changes);
 return old_version+1;
end;
$$;
revoke all on function public.save_household(jsonb,integer) from public,anon;
grant execute on function public.save_household(jsonb,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('receipts','receipts',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for select to authenticated using (bucket_id='receipts' and public.is_household_member());
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert to authenticated with check (bucket_id='receipts' and public.is_household_member() and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete to authenticated using (bucket_id='receipts' and public.is_household_member() and (storage.foldername(name))[1]=auth.uid()::text);
commit;


