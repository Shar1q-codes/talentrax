# Working locally

The local Supabase stack is the normal way to work on the ATS. Every change
goes migration first, is proven against a local database, and only then
goes anywhere hosted. Nothing is created by clicking in a dashboard (see
`README.md`).

## Prerequisites

- **Docker Desktop, running.** The CLI starts the whole stack as
  containers. `docker version` must print a Server section; if it says it
  cannot connect to the Docker API, start Docker Desktop and wait for it.
- `npm install`. The Supabase CLI is a devDependency, so its version is
  pinned in `package-lock.json` and `npx supabase` resolves to the same CLI
  on every machine.
- `.env.local`, copied from `.env.local.example`:

  ```bash
  cp .env.local.example .env.local
  ```

  The values in the example are the local stack's **public demo keys**:
  identical on every machine, never valid against a hosted project.
  **Except the secret key, which you fill in**: copy `SECRET_KEY` from
  `npx supabase status -o env` into `SUPABASE_SECRET_KEY`. It is a demo
  value too, but it looks exactly like a real Supabase secret, so GitHub's
  push protection refuses any commit that carries it.

## The environment variables

| Variable | Set where | If missing |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`; the deploy environment | The Supabase client throws **when it is constructed**, naming the variable and where to set it |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same | same |
| `SUPABASE_SECRET_KEY` | `.env.local`; the deploy **runtime** environment, as a secret | The secret-key client throws when it is constructed, naming it; only the resume-upload endpoints construct one. Staff sign-in calls to Auth go out with the publishable key instead, and no visitor address is forwarded |
| `APP_ENV` | **The deploy environment only.** Never `.env.local` | Treated as `local` |

**Every client checks its variables when it is constructed**, never at
import or build time, so `next build` and `check:seo` work with no Supabase
variables at all. The missing-variable error appears the first time code
that actually needs the database runs without them.

**The service-role key bypasses RLS.** It has no `NEXT_PUBLIC_` prefix, so
it is never inlined; `src/lib/supabase/admin.ts` is the only reader; and
`npm run build` ends with `scripts/check-bundle.mjs`, which fails if the
key's name appears in anything served to a browser or its value anywhere in
the build output, source maps included. The local value is a public demo
key; a hosted project's is a real secret and lives only in the deploy
platform's secret store.

**`APP_ENV`** is `local`, `staging` or `production`, and says which
environment this is. With `staging` or `production`, a
`NEXT_PUBLIC_SUPABASE_URL` containing `localhost` or `127.0.0.1` refuses to
boot: `next dev`, `next build` and `next start` all stop with an error
naming both values. Any other value of `APP_ENV` (a typo such as `prod`)
also refuses, rather than quietly meaning local.

It is `APP_ENV` and not `NODE_ENV` because `next build` sets `NODE_ENV` to
`production` on every machine. A local production build, which is what
`check:seo` runs against, is a production *build* that is not *deployed*,
and it has to keep working with the local stack's URL.

Do not put `APP_ENV` in `.env.local` to "test the guard". Set it on the
command line for one run instead:

```bash
APP_ENV=production npx next build   # must refuse, with .env.local pointing at 127.0.0.1
```

## The commands

| Script | Runs | What it does |
| --- | --- | --- |
| `npm run db:start` | `supabase start` | Brings the stack up |
| `npm run db:reset` | `supabase db reset` | Empty database, then every migration, then `seed.sql` |
| `npm run db:test` | `supabase test db` | The pgTAP schema tests |
| `npm run db:types` | `supabase gen types typescript --local` | Regenerates `src/lib/database.types.ts` |
| `npm run db:stop` | `supabase stop` | Stops the stack, keeps the data |

### `npx supabase start`

First run pulls the images, which takes a few minutes. Afterwards it starts
in seconds. It brings up Postgres, the API gateway (PostgREST, Auth,
Storage, Realtime, Edge Functions behind one port), Studio and Mailpit. The
ports come from `config.toml`:

| Service | Address |
| --- | --- |
| API gateway (what `NEXT_PUBLIC_SUPABASE_URL` points at) | `http://127.0.0.1:54321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (table editor, SQL editor, auth users) | `http://127.0.0.1:54323` |
| Mailpit (every email the stack "sends") | `http://127.0.0.1:54324` |
| Edge Functions | `http://127.0.0.1:54321/functions/v1/<name>` |

Mailpit is where sign-up confirmations, password resets and magic links
land. Nothing leaves the machine; open it in a browser to read them.

`npx supabase status` prints the URLs and keys again at any time.

### `npx supabase db reset`

**This destroys all local data.** It drops the local database, recreates
it, applies every file in `migrations/` in order, then runs `seed.sql`.
Anything typed into Studio or created through the app is gone.

That is the point: it is how you prove the migrations build a working
database from nothing, which is exactly what a hosted project will do.
Run it after writing or pulling a migration.

### `npx supabase test db`

Runs `tests/database/*.test.sql` with pgTAP against the running local
database. Run `db:reset` first so the tests see the migrations as written,
not whatever state the database drifted into. Run both before committing a
migration.

### `npm run db:types`

Regenerates `src/lib/database.types.ts` from the local schema. **Run it
after every migration, and commit the result.** The generated types are
what make app code type-safe against the database; a stale file compiles
happily against columns that no longer exist. The file is generated: never
edit it by hand.

### Erasure runs on a schedule

Migration 6 schedules `public.process_due_deletion_requests()` with pg_cron
every fifteen minutes, locally too. It only acts on requests an
administrator has accepted, so the seed data is untouched. To run it now,
from the SQL editor or psql as `postgres`:

```sql
select public.process_due_deletion_requests();
```

The storage half - deleting the queued objects in `storage_erasures` - is
the `storage-erasure-worker` Edge Function. pg_cron calls it only once two
Vault secrets exist, so locally it runs when you run it:

```bash
npx supabase functions serve          # in one terminal
curl -X POST -H "Authorization: Bearer $SERVICE_ROLE_KEY"   http://127.0.0.1:54321/functions/v1/storage-erasure-worker
```

`SERVICE_ROLE_KEY` is in `npx supabase status -o env`. Any other key gets
401. To have pg_cron call it locally, store the two secrets it reads:

```sql
select vault.create_secret('http://kong:8000/functions/v1/storage-erasure-worker', 'storage_worker_url');
select vault.create_secret('<the service role key>', 'storage_worker_key');
```

### `npx supabase functions serve`

Serves Edge Functions from `supabase/functions/<name>/` with hot reload,
using the Deno runtime pinned in `config.toml` (`[edge_runtime]`). Each is
reachable at `http://127.0.0.1:54321/functions/v1/<name>`. There are no
functions in this repo yet, so today this serves nothing.

### `npx supabase stop`

`npx supabase stop` stops the containers and keeps the data in Docker
volumes, so the next `start` picks up where you left off.

`npx supabase stop --no-backup` also deletes those volumes. Use it for a
clean slate, or when the stack is in a state `db reset` does not fix.

## Signing in as each seeded role

`seed.sql` creates one confirmed user per role. Every one uses the password
**`local-password-only`**, on the reserved `.test` domain, which can never
deliver mail.

| Email | Role |
| --- | --- |
| `super.admin@example.test` | `super_admin` |
| `platform.admin@example.test` | `platform_admin` |
| `bdm@example.test` | `bdm` |
| `full.desk.recruiter@example.test` | `full_desk_recruiter` |
| `recruiter@example.test` | `recruiter` |
| `research.analyst@example.test` | `research_analyst` |
| `content.manager@example.test` | `content_manager` |
| `marketing.manager@example.test` | `marketing_manager` |
| `employer.user@example.test` | `employer_user`, attached to the test employer |
| `job.seeker@example.test` | `job_seeker`, with their own candidate row |

**Staff accounts sign in at `/staff/sign-in`** on the local site (`npm run
dev`, or a production build). The first sign-in asks for an authenticator
app and sets it up; after that, every sign-in asks for its code. To start an
account over, remove its factors as `STAFF-ACCESS.md` describes.

The candidate `/login` page is not wired to anything yet. Against the API
directly, this returns a session whose `access_token` is a real JWT for
that user:

```bash
curl -s "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"recruiter@example.test","password":"local-password-only"}'
```

Then query as that user, and RLS applies exactly as it will for them.
**For a staff account that token is `aal1`, so it reads nothing but its own
profile row** (migration 14): a staff role counts only after the second
factor. To query as a staff role from the command line, sign in through the
site, or use the pgTAP approach below with `'aal', 'aal2'` in the claims.
`employer.user` and `job.seeker` need no second factor:

```bash
curl -s "http://127.0.0.1:54321/rest/v1/candidates?select=full_name" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer <access_token>"
```

From supabase-js, `supabase.auth.signInWithPassword({ email, password })`
does the same. In Studio's SQL editor, the role selector above the editor
runs a query as `anon`, or as `authenticated` impersonating a chosen user.

The pgTAP tests do not sign in at all. They set `request.jwt.claims`
inside the transaction (see `tests/database/10_access.test.sql`), which is
the quickest way to check a policy from `psql`.

## Going to hosted

**Documented here, not done.** No hosted project exists, nothing is linked,
and nothing below has been run.

### Pushing the schema

```bash
npx supabase link --project-ref <project-ref>   # asks for the database password
npx supabase db push --dry-run                  # shows which migrations would apply
npx supabase db push
```

`db push` applies every migration in `migrations/` that the hosted project
has not recorded yet, in order. Migrations only go forward there: fix a
mistake with a new migration, never by editing one that has been pushed.
The `rollback/` scripts are for local databases only.

### Seed data does NOT go

`db push` does not run `seed.sql`, and nobody runs it by hand against a
hosted project. The seed is ten accounts with a shared, published password
(`local-password-only`, written in this file), including a `super_admin`.
On a hosted project those are ten working logins anyone who has read this
repo can use, one of them with full control. It also writes a fake employer,
requisition and candidates into tables that are meant to hold real ones.

Hosted projects start with no users. The first admin is created
deliberately, through the dashboard, with a real address and a real
password, and promoted by **`snippets/promote_staff.sql`**, which the
project operator runs in the SQL editor. Every later staff account is made
the same way: there is no self-service path to a staff role. The file says
what to edit, refuses anything that is not a plain promotion to staff, and
is safe to run twice.

**Read `STAFF-ACCESS.md` before creating the first staff account.** It is
the runbook for a staff member who loses their second factor: who may
reset it, what proves the person asking is who they say, and the SQL the
operator runs. It also requires two `super_admin` accounts and two people
with project access before go-live, so nobody ever has to reset their own.

### What a migration cannot configure

`config.toml` configures only the local stack. These live in the hosted
project's dashboard, must be set for each hosted project, and are worth
writing down as they are set:

- **SMTP.** Hosted Supabase's built-in mailer is rate-limited and meant for
  testing. Configure a real provider (Authentication > Emails > SMTP
  settings) before anyone signs up.
- **Email confirmation on.** Required, not optional: a job seeker may create
  a candidate row under their account's email, which is only safe if that
  email is verified (see `README.md`, "Not in this schema"). Locally
  `enable_confirmations = false`; hosted, it must be on.
- **Site URL** (Authentication > URL configuration): the project's own site
  origin, the same value as that environment's `NEXT_PUBLIC_SITE_URL`.
- **Redirect URLs**: the exact URLs auth emails and sign-in may send people
  back to. Exact origins only, no wildcards across domains, and production's
  list must not include localhost or staging.
- **TOTP multi-factor on** (Authentication > Multi-Factor): enrolment and
  verification both. Staff sign-in requires it; without it no staff member
  can get past setup.
- **Auth rate limits** (Authentication > Rate Limits): **leave the sign-in
  and verification limits at their defaults** (30 sign-ins per 5 minutes, 15
  MFA verifications per minute, per address). Read `STAFF-ACCESS.md`, "Two
  paths to the password", before changing them. In short: the publishable key is
  public, so a password can be tried straight against Auth's API, past our
  sign-in page and its per-address delay (migration 16), and on that path
  these limits are the only guard. The cost: until forwarding is on (next
  item), Auth sees our server's address for every attempt made through our
  page, so a flood there can block staff sign-in for up to five minutes.
- **IP address forwarding for Auth: turn it on.** It is off for a new
  project. Enable it in the dashboard or through the Management API, as
  Supabase's rate-limit guide describes
  (https://supabase.com/docs/guides/auth/rate-limits). The code already
  sends `Sb-Forwarded-For` with the secret key on staff sign-in calls
  (`src/lib/supabase/auth-fetch.ts`); nothing in the repo changes. Then
  verify, on the deployed site:
  1. Sign in as a staff member. In the project's Auth logs, the sign-in
     shows the visitor's own address, not Netlify's.
  2. From one network, make enough failed sign-ins to hit Auth's sign-in
     limit (or lower it briefly in a staging project). From a second
     network, a staff member still signs in. Before forwarding, the second
     would have been refused too.
  3. `SUPABASE_SECRET_KEY` is set in the runtime environment. Without it the
     sign-in calls go out with the publishable key, Auth ignores the header,
     and step 1 shows Netlify's address.
- **Disable the legacy API keys** (Project Settings > API Keys) once the
  deployed site runs on the publishable and secret keys. Nothing in the app
  uses them. The storage-erasure Edge Function reads the
  `SUPABASE_SERVICE_ROLE_KEY` the Edge runtime injects: check that it gets a
  working key before disabling the legacy ones, or move it to the secret
  key first.
- **Storage limits**: bucket file-size limit and allowed MIME types, and the
  `storage.objects` policies the README lists as missing, before any upload
  is wired.

### Three environments, eventually

| Environment | Supabase | Site | Data |
| --- | --- | --- | --- |
| Local | `supabase start` on your machine | `next dev` | Seed only |
| Staging | Its own hosted project | A Netlify branch or preview deploy | Test data only |
| Production | Its own hosted project | talentraxglobal.com | Real |

- **Staging is a separate project**, never a schema or a flag inside
  production's. Migrations reach staging first, then production.
- **Staging must be noindex.** It serves the same pages as production on
  another origin, and indexed it would compete with the real site and
  expose an unfinished one. Every staging page must carry
  `robots: noindex`, not only a `Disallow` in `robots.txt` (a crawler that
  is disallowed never reads the noindex). How the build learns it is
  staging is not built yet.
- **Staging never holds real candidate data.** Not a copy of production, not
  a "few real resumes to test with". Candidate data is personal data, and
  staging has looser access, test accounts and none of the privacy
  commitments the production policy makes. Test with invented records only.

Each hosted environment sets `APP_ENV` (`staging` or `production`) and its
own `NEXT_PUBLIC_SUPABASE_URL` and anon key in its build environment;
`.env.production.example` lists the names. A deploy whose `APP_ENV` is set
and whose Supabase URL is local refuses to start
(`src/lib/supabase/env.ts`). `APP_ENV` is also what a staging build will
read to emit noindex, once that is built.
