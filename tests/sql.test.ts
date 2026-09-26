import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { demoData, blank, uid, today } from "../src/model.ts";

test("SQL: instalación, miembros, concurrencia, reglas de dinero, auditoría y RLS", async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,name text,bucket_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema public,auth,storage to authenticated,anon;
 insert into auth.users values('11111111-1111-4111-a111-111111111111','luis21aro@gmail.com'),('22222222-2222-4222-a222-222222222222','mjrb11@hotmail.com'),('33333333-3333-4333-a333-333333333333','intruso@example.com');`);
  await db.exec(
    await readFile(
      new URL("../supabase/01_schema.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/02_members.sql", import.meta.url),
      "utf8",
    ),
  );
  // Reejecutar no borra ni duplica el hogar.
  await db.exec(
    await readFile(
      new URL("../supabase/01_schema.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    `set role authenticated;set test.uid='11111111-1111-4111-a111-111111111111'`,
  );
  assert.equal(
    (await db.query("select * from public.household")).rows.length,
    1,
  );
  const data = demoData();
  const saved = await db.query<{ v: number }>(
    "select public.save_household($1::jsonb,0) as v",
    [JSON.stringify(data)],
  );
  assert.equal(saved.rows[0].v, 1);
  await assert.rejects(
    () =>
      db.query("select public.save_household($1::jsonb,0)", [
        JSON.stringify(data),
      ]),
    /CONFLICT/,
  );
  const invalid = structuredClone(data);
  invalid.entries.push({
    id: uid(),
    name: "Invalid",
    kind: "expense",
    amount: 999999999,
    date: today(),
    owner: "luis",
    account: "a1",
    category: "Otros",
    note: "",
    createdBy: "Prueba",
    updatedAt: new Date().toISOString(),
  });
  await assert.rejects(
    () =>
      db.query("select public.save_household($1::jsonb,1)", [
        JSON.stringify(invalid),
      ]),
    /INSUFFICIENT_BALANCE/,
  );
  const audit = await db.query<{ changes: unknown[] }>(
    "select changes from public.household_audit",
  );
  assert.equal(audit.rows.length, 1);
  assert.ok(audit.rows[0].changes.length > 0);
  await assert.rejects(
    () => db.exec(`update public.household set version=99`),
    /permission denied/,
  );
  await db.exec(`set test.uid='22222222-2222-4222-a222-222222222222'`);
  assert.equal(
    (await db.query("select * from public.household")).rows.length,
    1,
  );
  await db.query("select public.save_household($1::jsonb,1)", [
    JSON.stringify(data),
  ]);
  await db.exec(`set test.uid='33333333-3333-4333-a333-333333333333'`);
  assert.equal(
    (await db.query("select * from public.household")).rows.length,
    0,
  );
  await assert.rejects(
    () =>
      db.query("select public.save_household($1::jsonb,2)", [
        JSON.stringify(blank()),
      ]),
    /ACCESS_DENIED/,
  );
  await db.exec("reset role; set role anon");
  await assert.rejects(
    () => db.query("select * from public.household"),
    /permission denied/,
  );
  await db.close();
});
