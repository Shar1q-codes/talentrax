# Staff access: resetting a second factor

The runbook for one situation: **a staff member cannot produce their
second factor** - a lost or wiped phone, a deleted authenticator app - and
asks for it to be reset.

Written before staff MFA is built (build step 6), on purpose. The reset is
the weakest point of any second factor: an attacker who has someone's
password and can talk their way through a reset has beaten MFA without
touching it. So who may reset, what they run and what they accept as proof
are decided here first, and the MFA build implements this rather than
inventing a path under time pressure. CLIENT-CONFIRM.md item 27 is the
client's half.

**Status: MFA is not built.** Staff sign-in does not exist yet, and TOTP
enrolment is off in `config.toml` (`[auth.mfa.totp] enroll_enabled =
false`). The SQL below was run against the local stack on 2026-10-02,
against a factor inserted by hand (see **Verified locally**).

---

## Who can reset a factor

Two people, and neither of them is the person whose factor it is.

| Who | Does what | Must be |
| --- | --- | --- |
| **The operator** | Runs the SQL below in the hosted project | Someone with SQL editor access to the hosted Supabase project (an Owner or Administrator of its Supabase organisation) |
| **The approver** | Confirms the person's identity on the call, and approves the reset | A `super_admin` in the ATS |
| **The subject** | Asks, joins the call, enrols a new factor while it is still going | Anyone with a staff role |

- **The operator and the approver may be the same person.** Neither may
  be the subject.
- **Nobody resets their own factor.** That includes a `super_admin`, and
  the operator. Their reset is done by someone else, under the same rules.
- **There is no reset in the app, and none is to be built.** No ATS role,
  `super_admin` included, can touch `auth.mfa_factors`, and no page or
  action will. An in-app "reset this user's MFA" button would let anyone
  who takes over an admin session strip the second factor from every other
  account. Removing a factor is a database operation, done by a person
  with project access.

**Before go-live there must be at least two of each:** two `super_admin`
accounts and two people with project access, not the same pair. With one
of each, the one admin losing their phone either locks the project or
forces the self-reset this document forbids.

---

## What proves the person is who they say they are

Assume the person asking has the account's password **and** its mailbox.
That is exactly the case a second factor exists for, so nothing an
attacker in that position could do counts as proof.

**Not proof, on its own or together:**

- an email from the account's own address;
- a call or text from a number the request supplies;
- a phone number from the person's ATS profile (the account can edit it);
- knowing their own personal details, employee number or manager's name;
- a message from their chat account;
- urgency, seniority, or someone vouching by message.

**Proof is all three of these:**

1. **A call back to a number already on file,** taken from the client's
   own staff records - not from the request, and not from the ATS. The
   operator places the call; the person never supplies the number.
2. **Live video, or in person,** with the approver, who recognises the
   person by sight. A voice alone is not enough.
3. **The person confirms, on that call, that they asked for the reset.**
   A reset they did not ask for is the strongest sign of a takeover
   attempt there is.

If any step fails, or cannot happen (no number on file, nobody who knows
them by sight is available), **there is no reset.** The account stays
locked until it can be done properly. A locked staff account loses nothing:
every record it worked on is still there, and others can pick its work up.

**Look before resetting.** In the hosted dashboard, Authentication > Users
> that user, and the Auth logs, show recent sign-ins. Failed second-factor
attempts the person does not recognise, or sign-ins from somewhere they
have not been, mean the password is known to someone else: reset the
password too (see **Passwords**), in the same call.

---

## What the operator runs

**The person must be on the call, ready to enrol, before step 2.** Between
the reset and their enrolment the account is protected by its password
alone, and whoever has that password could enrol a factor of their own
first. The window is the length of the call and no longer.

All of it runs in the hosted project's SQL editor (Database > SQL editor),
which runs as `postgres`.

**1. Find the account, and check it is the right one.**

```sql
select u.id, u.email, p.role, p.is_active,
       f.id as factor_id, f.factor_type, f.status, f.created_at as factor_created_at,
       u.last_sign_in_at
from auth.users u
join public.profiles p on p.id = u.id
left join auth.mfa_factors f on f.user_id = u.id
where u.email = 'the.person@their-domain';
```

Check that `role` is a staff role, not `employer_user` or `job_seeker`, and
that this is the person on the call. Copy the `id`.

**2. Remove every factor, and end every session.**

```sql
begin;
delete from auth.mfa_factors where user_id = '<id from step 1>';
delete from auth.sessions    where user_id = '<id from step 1>';
commit;
```

- Deleting the factors removes their challenges, and any recovery codes, with
  them (`on delete cascade`).
- Deleting the sessions removes their refresh tokens (`on delete cascade`),
  so no device that was signed in can renew its session.
- **An access token already issued stays valid until it expires** -
  `jwt_expiry`, 3600 seconds unless the hosted project's Auth settings say
  otherwise. Supabase cannot revoke a token it has issued. If a takeover is
  suspected, that hour matters: say so to the approver, and treat anything
  that account does in it as suspect.

**3. The person signs in, on the call, and enrols a new factor.** Their
password still works; with no factor, staff sign-in sends them straight to
enrolment (to be built in step 6, and required of it).

**4. Confirm only their factor exists.**

```sql
select id, factor_type, status, created_at
from auth.mfa_factors
where user_id = '<id from step 1>';
```

Exactly one row, `verified`, created during the call. **Anything else - two
rows, or one created before they enrolled - means someone else enrolled
first.** Repeat step 2, reset the password, and do not end the call until
step 4 shows one factor that is theirs.

**5. Record it** (see **The record**).

---

## Passwords

There is no staff password reset in the app either (the plan for step 6).
An administrator sends a recovery email from the dashboard, Authentication
> Users > that user > Send password recovery. It goes to the account's own
address, so it is only safe when the mailbox is not in doubt.

**The same identity check and the same two-person rule apply.** A password
reset for someone who has also lost their second factor is the full
takeover case: do both in one call, password first, then the factor, then
step 4.

---

## The record

Every reset is written down, by the approver, the same day:

- when, and the account's `id` (not its name or email);
- who operated and who approved;
- how identity was proven: which number was called back and where it came
  from, and who recognised them on video or in person;
- the new factor's `created_at` from step 4;
- anything unusual seen in the sign-in history.

**Where it is kept is the client's decision** (CLIENT-CONFIRM.md item 27),
and it is not this repo. It is not the ATS audit log either: that records
changes to ATS tables only, its action types do not include this, and
nothing in step 2 touches an ATS table.

---

## Verified locally

On the local stack, 2026-10-02, with the seeded `recruiter@example.test`
(TOTP enrolment is off locally, so the factor was inserted by hand):

| Step | Result |
| --- | --- |
| Before | 1 factor, 2 sessions, 3 refresh tokens |
| Step 2 | 1 factor and 2 sessions deleted |
| After | 0 factors, 0 sessions, 0 refresh tokens |
| The old refresh token | refused: `400 refresh_token_not_found` |
| Password sign-in | still works, `200`: what sends the person to enrolment |

---

## What staff MFA (build step 6) must keep true

- A staff account with no verified factor reaches enrolment and nothing
  else.
- Nothing in the app removes another user's factor.
- Removing your own factor needs a session already at the second factor,
  and is refused if it would leave the account with none.
- The database, not only the page, requires the second factor before a
  staff account reads the form tables.
