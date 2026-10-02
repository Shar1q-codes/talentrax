# Browser regression suite

```bash
npm run test:browser          # build with no database, then run everything not @db
CI=1 npm run test:browser     # headless only; @headed tests are reported as skipped
npm run test:browser:db       # the @db suite: needs `npm run db:start` first
```

`test:browser` builds and then runs Playwright, which serves that build
with `next start` on port 3210. It never runs against `next dev`. Chromium
only. The first run on a machine needs the browser itself:
`npx playwright install chromium`.

**Two builds, two suites.** `test:browser` builds with the Supabase
connection blanked (`scripts/build-without-database.mjs`), whatever
`.env.local` says, so it needs no stack and sees every wired form closed.
`test:browser:db` builds with `.env.local`'s values, so the forms gate opens
the wired forms against the local stack (`playwright.db.config.ts`).

## What runs where

| Tag | Runs headless in CI | Why |
| --- | --- | --- |
| (none) | yes | |
| `@cdp` | yes, Chromium only | zoom and touch are driven through the Chrome DevTools Protocol |
| `@headed` | **no**, skipped under `CI=1` | needs classic scrollbars that take layout width; the headless shell's are overlays that take none |
| `@db` | **no**: only under `test:browser:db` | submits the wired forms to the local Supabase stack and reads back, as the service role, what was stored |

## The wired forms

| Path | No database (`site.spec.ts`) | `@db` (`forms.db.spec.ts`) |
| --- | --- | --- |
| Closed: notice, "nothing was sent", no request off the site, no storage named in the privacy policy | yes | |
| Stored: confirmation focused; one row, `is_test`, with a submission key | | yes |
| Validation error: summary focused, nothing sent | empty submit only | yes, and no request to the stack |
| 429: the wait in minutes, focused, what was typed kept, nothing stored | | yes, against the real limiter |
| A retry after a lost response: stored once | | yes |
| The privacy policy names the storage | | yes |

## The resume form

| Path | No database (`site.spec.ts`) | `@db` (`forms.db.spec.ts`) |
| --- | --- | --- |
| Closed: notice, "nothing was sent", no request off the site, the file included | yes | |
| Stored: details, a signed upload, the check passed; the row names the path under its own id | | yes |
| A file named `.pdf` that is not one: details kept, file rejected (`signature_mismatch`) and queued for deletion | | yes |
| A file of the wrong type: validation error, nothing sent | | yes |
| 429: the wait shown, nothing stored, no file sent | | yes |
| A retry after a lost upload response: one row, one path, received | | yes |
| `/staff/upload-resume`: sign-in required; the same form, open, once signed in | | yes (`staff.db.spec.ts`) |

What a local run cannot show: production's 404 for the public route, which
no local build can produce (a production build refuses a local stack).
`decideResumeAccess()` is pinned by `npm test` instead.

## Staff sign-in

| Path | No database (`site.spec.ts`) | `@db` (`staff.db.spec.ts`) |
| --- | --- | --- |
| `/staff` with no session goes to sign-in | yes, and it says sign-in is not available | yes |
| First sign-in: password, set up the app (QR and key), a wrong code, then in | | yes |
| The session cookie is HttpOnly, `path=/staff`, SameSite=Lax | | yes |
| Sign out; sign in again goes to the code step | | yes |
| A password-only token reads nothing from the API | | yes |
| Wrong password, unknown address, non-staff account: one message, at least 1.5 s | | yes |
| Failures earn a growing delay; the right password still gets in after it; a second attempt while one is in progress is refused | | yes, after first proving the address starts with no delay |

**Idempotent.** The staff spec's `afterAll` clears the sign-in count of
every address it used (`reset_sign_in_attempts`, service role only), and
nothing clears it at the start, so the lockout test's opening sign-in proves
the previous run left no delay behind. Run the suite twice in a row to see
it.

The tests play the phone's part with `totp.ts` (RFC 6238, checked against
the RFC's own vectors). The second sign-in waits for the next 30-second
window, so it never depends on whether Auth would accept the same code twice.

The 429 test fills one client address's hourly allowance and then submits
from the same address. Locally nothing sets `cf-connecting-ip` (on hosted
Supabase the edge does), so the test adds it to each request, from a fresh
documentation-range IPv6 /64 per run. Every run also counts toward each
form's global ceiling of 300 an hour; `npm run db:reset` clears the ledger
if repeated runs ever reach it.

The zoom test emulates zoom's effect on layout: a 1200px window at 150% is
800 CSS px at a device scale factor of 1.5. Playwright cannot drive the
browser's own zoom control.

## The six defects of the first browser pass

Each one has tests that failed on the code before the fix
(`d10a94b~1`) and pass after.

| # | Defect | Spec |
| --- | --- | --- |
| 1 | related link on a full article opened the modal over an empty page | `insights-modal.spec.ts` |
| 2 | closing the modal left focus nowhere (Escape, Close, Back) | `insights-modal.spec.ts` |
| 3 | the rail reset to the first card on any width change | `rail.spec.ts`; 3d (scrollbar) in `rail-scrollbar.spec.ts` |
| 4 | reloading an open article landed mid-article | `insights-modal.spec.ts` |
| 5 | a mouse drag on a card did not hold the pause | `rail.spec.ts` |
| 6 | the focus ring followed the title text, not the card | `rail.spec.ts` |

The rest - `site.spec.ts` and the "as the browser pass found it working"
blocks - pin what that pass found already correct.
