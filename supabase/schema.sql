-- NextUp Credit Pro schema (Supabase / Postgres). Run once in SQL Editor.
create extension if not exists pgcrypto;

create table orgs(id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
create table profiles(id uuid primary key references auth.users on delete cascade, org_id uuid references orgs, role text not null default 'agent' check(role in('owner','manager','agent','client','diy')), first_name text, last_name text, created_at timestamptz default now());
create table clients(id uuid primary key default gen_random_uuid(), org_id uuid not null references orgs, assigned_to uuid references profiles, user_id uuid references auth.users, first_name text not null, last_name text not null, email text, phone text, address text, dob_enc bytea, ssn4_enc bytea, stage text default 'new', created_at timestamptz default now());
create table reports(id uuid primary key default gen_random_uuid(), org_id uuid not null, client_id uuid not null references clients on delete cascade, file_path text, created_at timestamptz default now());
create table accounts(id uuid primary key default gen_random_uuid(), org_id uuid not null, client_id uuid not null references clients on delete cascade, report_id uuid references reports, creditor text, acct_type text, acct_last4 text, bureau text, balance numeric, decision text default 'ignore' check(decision in('dispute','ignore')),
  method text default 'ours' check(method in('ours','custom')), custom_reason text check(length(custom_reason)<=1000), reason text, round int default 1, status text default 'open', created_at timestamptz default now());
create table letters(id uuid primary key default gen_random_uuid(), org_id uuid not null, client_id uuid not null references clients on delete cascade, bureau text, round int, body text, sent_on date, created_at timestamptz default now());
create table documents(id uuid primary key default gen_random_uuid(), org_id uuid not null, client_id uuid references clients on delete cascade, kind text, file_path text, created_at timestamptz default now());
create table agreements(id uuid primary key default gen_random_uuid(), org_id uuid not null, client_id uuid not null references clients on delete cascade, kind text check(kind in('agreement','poa')), signed_name text, signed_at timestamptz default now(), ip text);
create table messages(id uuid primary key default gen_random_uuid(), org_id uuid not null, client_id uuid not null references clients on delete cascade, sender uuid, body text, created_at timestamptz default now());
create table activity_log(id bigserial primary key, org_id uuid, actor uuid, action text, target text, at timestamptz default now());
create table api_usage(id bigserial primary key, org_id uuid, client_id uuid, kind text, tokens_in int, tokens_out int, at timestamptz default now());

-- helpers
create function my_org() returns uuid language sql stable security definer set search_path=public as $$ select org_id from profiles where id=auth.uid() $$;
create function my_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() $$;
create function can_see_client(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from clients c where c.id=cid and c.org_id=my_org() and (my_role() in('owner','manager') or c.assigned_to=auth.uid() or c.user_id=auth.uid())) $$;

do $$ declare t text; begin
 foreach t in array array['orgs','profiles','clients','reports','accounts','letters','documents','agreements','messages','activity_log','api_usage'] loop
  execute format('alter table %I enable row level security',t); end loop; end $$;

create policy org_read on orgs for select using(id=my_org());
create policy prof_read on profiles for select using(id=auth.uid() or org_id=my_org());
create policy cl_all on clients for all using(can_see_client(id)) with check(org_id=my_org());
create policy cl_ins on clients for insert with check(org_id=my_org() and my_role() in('owner','manager','agent'));
do $$ declare t text; begin
 foreach t in array array['reports','accounts','letters','documents','agreements','messages'] loop
  execute format('create policy %I on %I for all using(can_see_client(client_id)) with check(org_id=my_org() and can_see_client(client_id))',t||'_all',t); end loop; end $$;
create policy log_read on activity_log for select using(org_id=my_org() and my_role() in('owner','manager'));
create policy log_ins on activity_log for insert with check(org_id=my_org());   -- insert-only: no update/delete policies
create policy use_read on api_usage for select using(org_id=my_org() and my_role() in('owner','manager'));

-- Sensitive fields: encrypted with a key kept in Vault (never in the app). Reveal is logged.
create function set_sensitive(cid uuid, dob text, ssn4 text) returns void language plpgsql security definer set search_path=public as $$
declare k text;
begin
 select decrypted_secret into k from vault.decrypted_secrets where name='data_key';
 if k is null then raise exception 'data_key missing in Vault'; end if;
 if not can_see_client(cid) then raise exception 'not allowed'; end if;
 if ssn4 is not null and ssn4 !~ '^\d{4}$' then raise exception 'ssn4 must be exactly 4 digits'; end if;
 update clients set dob_enc=pgp_sym_encrypt(dob,k), ssn4_enc=pgp_sym_encrypt(ssn4,k) where id=cid;
end $$;
create function reveal_sensitive(cid uuid) returns table(dob text, ssn4 text) language plpgsql security definer set search_path=public as $$
declare k text;
begin
 select decrypted_secret into k from vault.decrypted_secrets where name='data_key';
 if k is null then raise exception 'data_key missing in Vault'; end if;
 if not can_see_client(cid) then raise exception 'not allowed'; end if;
 insert into activity_log(org_id,actor,action,target) values(my_org(),auth.uid(),'reveal_sensitive',cid::text);
 return query select pgp_sym_decrypt(dob_enc,k), pgp_sym_decrypt(ssn4_enc,k) from clients where id=cid;
end $$;
revoke all on function set_sensitive(uuid,text,text), reveal_sensitive(uuid) from public;
grant execute on function set_sensitive(uuid,text,text), reveal_sensitive(uuid) to authenticated;
