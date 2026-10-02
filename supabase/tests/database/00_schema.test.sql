-- Structural guarantees, asserted over the catalog so a table added later
-- that forgets one fails here rather than in production.
-- Run with `supabase test db` (pgTAP), or see supabase/README.md.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(22);

-- Every table in public has RLS enabled.
select is_empty(
  $$ select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and not c.relrowsecurity $$,
  'RLS is enabled on every table in public'
);

-- Every table has the four standard columns.
select is_empty(
  $$ select t.tablename || '.' || col
     from pg_tables t
     cross join unnest(array['id', 'created_at', 'updated_at', 'created_by']) as col
     where t.schemaname = 'public'
       and not exists (
         select 1 from information_schema.columns c
         where c.table_schema = 'public' and c.table_name = t.tablename and c.column_name = col) $$,
  'every table has id, created_at, updated_at and created_by'
);

-- Every id defaults to gen_random_uuid(), except profiles, whose id is the auth user's.
select is_empty(
  $$ select c.table_name from information_schema.columns c
     join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
     where c.table_schema = 'public' and c.column_name = 'id'
       and c.table_name <> 'profiles'
       and coalesce(c.column_default, '') not like 'gen_random_uuid()%' $$,
  'every id defaults to gen_random_uuid()'
);

-- Every business table is soft-deletable. The exceptions are the taxonomy
-- (retired with is_active), the two append-only logs, the settings row, and
-- three tables from migration 6 that must never be hidden: a deletion
-- request is the record 11 CCR 7101 requires be kept, a retention rule is
-- switched off with is_active, and an outbox row is finished, not deleted.
select is_empty(
  $$ select t.tablename from pg_tables t
     where t.schemaname = 'public'
       and t.tablename not in (
         'audit_log', 'audit_settings', 'submission_events',
         'deletion_requests', 'retention_rules', 'storage_erasures',
         'desks', 'specialties', 'engagement_types', 'work_modes', 'us_states',
         'job_statuses', 'lead_statuses', 'candidate_statuses', 'submission_statuses')
       and not exists (
         select 1 from information_schema.columns c
         where c.table_schema = 'public' and c.table_name = t.tablename
           and c.column_name = 'deleted_at') $$,
  'every business table has deleted_at'
);

-- Every soft-deletable table has its restrictive hide-deleted policy.
select is_empty(
  $$ select c.table_name from information_schema.columns c
     join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
     where c.table_schema = 'public' and c.column_name = 'deleted_at'
       and not exists (
         select 1 from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.table_name
           and p.permissive = 'RESTRICTIVE' and p.cmd = 'SELECT') $$,
  'every soft-deletable table hides deleted rows with a restrictive policy'
);

-- Every table except the audit log itself carries the stamp and audit triggers.
select is_empty(
  $$ select t.tablename || ':' || trg
     from pg_tables t
     cross join unnest(array['stamp_row', 'audit_row']) as trg
     where t.schemaname = 'public' and t.tablename <> 'audit_log'
       and not exists (
         select 1 from pg_trigger g
         where g.tgrelid = format('public.%I', t.tablename)::regclass and g.tgname = trg) $$,
  'every table has the stamp_row and audit_row triggers'
);

-- Every soft-deletable table pins deleted_at to the deleting transaction.
select is_empty(
  $$ select c.table_name from information_schema.columns c
     join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
     where c.table_schema = 'public' and c.column_name = 'deleted_at'
       and not exists (
         select 1 from pg_trigger g
         where g.tgrelid = format('public.%I', c.table_name)::regclass
           and g.tgname = 'stamp_soft_delete') $$,
  'every soft-deletable table has the stamp_soft_delete trigger'
);

-- Every string-like column of every audited table is classified personal or
-- not (migration 6). The audit trigger redacts an unclassified column anyway;
-- this makes the omission a failing test instead of a silent gap in the log.
select is_empty(
  $$ select c.relname || '.' || a.attname
     from pg_attribute a
     join pg_class c on c.oid = a.attrelid
     join pg_type t on t.oid = a.atttypid
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and a.attnum > 0 and not a.attisdropped
       and (t.typcategory in ('S', 'A', 'I') or t.typname in ('json', 'jsonb'))
       and c.relname not in (
         'audit_log', 'desks', 'specialties', 'engagement_types', 'work_modes', 'us_states',
         'job_statuses', 'lead_statuses', 'candidate_statuses', 'submission_statuses')
       and not exists (
         select 1 from private.column_classification k
         where k.table_name = c.relname and k.column_name = a.attname) $$,
  'every string-like column is classified personal or not, for the audit log'
);

-- No DELETE policy exists on any table.
select is_empty(
  $$ select tablename || '.' || policyname from pg_policies
     where schemaname = 'public' and cmd in ('DELETE', 'ALL') $$,
  'no DELETE (or ALL) policy exists anywhere'
);

-- No end-user role, nor service_role, holds DELETE or TRUNCATE on any table.
select is_empty(
  $$ select grantee || ' ' || privilege_type || ' ' || table_name
     from information_schema.role_table_grants
     where table_schema = 'public'
       and grantee in ('anon', 'authenticated', 'service_role')
       and privilege_type in ('DELETE', 'TRUNCATE') $$,
  'nobody holds DELETE or TRUNCATE through the API roles'
);

-- anon has no SELECT on any table or view.
select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' and privilege_type = 'SELECT' $$,
  'anon holds SELECT on nothing'
);

-- anon may insert into exactly the three public-form tables.
select is(
  (select string_agg(distinct table_name::text, ',' order by table_name::text)
   from information_schema.role_column_grants
   where table_schema = 'public' and grantee = 'anon' and privilege_type = 'INSERT'),
  'contact_messages,leads,resume_submissions',
  'anon may insert into the three public-form tables and no others'
);

-- anon holds no privilege other than INSERT anywhere.
select is_empty(
  $$ select table_name || ' ' || privilege_type from information_schema.role_column_grants
     where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'INSERT' $$,
  'anon holds nothing but column INSERT'
);

-- The views are SELECT-only for everyone (an updatable owner-rights view would bypass RLS).
select is_empty(
  $$ select table_name || ' ' || grantee || ' ' || privilege_type
     from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name in ('public_jobs', 'employer_requisitions',
                          'employer_submissions', 'employer_submission_documents')
       and grantee in ('anon', 'authenticated', 'service_role')
       and privilege_type <> 'SELECT' $$,
  'the views grant SELECT and nothing else'
);

-- No foreign key cascades or nulls on delete.
select is_empty(
  $$ select conrelid::regclass || '.' || conname from pg_constraint
     where contype = 'f' and connamespace = 'public'::regnamespace
       and confdeltype not in ('r', 'a') $$,
  'no foreign key in public cascades or sets null on delete'
);

-- Every foreign key is ON DELETE RESTRICT specifically, not the NO ACTION default.
select is_empty(
  $$ select conrelid::regclass || '.' || conname from pg_constraint
     where contype = 'f' and connamespace = 'public'::regnamespace
       and confdeltype <> 'r' $$,
  'every foreign key is ON DELETE RESTRICT'
);

-- Every foreign key is covered by an index whose leading columns are the key.
select is_empty(
  $$ select c.conrelid::regclass || '.' || c.conname
     from pg_constraint c
     where c.contype = 'f' and c.connamespace = 'public'::regnamespace
       and not exists (
         select 1 from pg_index i
         where i.indrelid = c.conrelid
           and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
           and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey) $$,
  'every foreign key has a covering index'
);

-- The embedding column is 1536-dimensional and HNSW-indexed with cosine ops.
select is(
  (select format_type(a.atttypid, a.atttypmod) from pg_attribute a
   where a.attrelid = 'public.candidate_embeddings'::regclass and a.attname = 'embedding'),
  'vector(1536)',
  'embeddings are vector(1536)'
);
select ok(
  exists (select 1 from pg_indexes
          where tablename = 'candidate_embeddings'
            and indexdef like '%USING hnsw%vector_cosine_ops%'),
  'embeddings carry an HNSW cosine index'
);

-- The role enum is the ten roles, in order of power.
select is(
  enum_range(null::public.app_role)::text,
  '{super_admin,platform_admin,bdm,full_desk_recruiter,recruiter,research_analyst,content_manager,marketing_manager,employer_user,job_seeker}',
  'app_role is the ten roles in order'
);

-- The taxonomy matches src/content/taxonomy.ts: three models, three desks, fifteen specialties.
select results_eq(
  $$ select slug from public.engagement_types order by sort_order $$,
  $$ values ('direct-hire'), ('contract'), ('executive-search') $$,
  'engagement types are exactly the three offered models'
);
select is(
  (select string_agg(desk || ':' || slug, ',' order by desk, sort_order) from public.specialties),
  'healthcare:nursing,healthcare:np-aprn,healthcare:allied-health,healthcare:physicians,'
  || 'professional:accounting-finance,professional:human-resources,professional:administrative,'
  || 'professional:sales-marketing,professional:trades,'
  || 'technology:software-engineering,technology:cybersecurity,technology:data,technology:cloud,'
  || 'technology:devops,technology:qa',
  'specialties match the site taxonomy'
);

select * from finish();
rollback;
