---
name: wire-expired-postings
description: What to do when real job postings land - wire the 410 for expired postings (middleware or netlify.toml redirects, both from getRecentlyExpiredSlugs()) and add the JobPosting assertions to check:seo. Use when jobs.ts stops returning [] or when asked about expired postings, 410s or the job board's SEO checks.
---

# Wiring expired job postings and the posting checks

Moved out of CLAUDE.md so it loads only when this work is being done. The
constraint that stays in CLAUDE.md: an expired posting answers 410 Gone,
never 404 and never a redirect.

## Expired job postings

**A posting past `validThrough` must answer 410 Gone.** Not 404, and never a
redirect: 410 is the signal Google treats as definitive removal, and anything
softer leaves a dead job in the index for weeks.

What exists today:

- `isExpired(job, now)` in `src/lib/jobs.ts`, unit tested at the day
  boundary.
- `generateStaticParams` filters expired postings, so one never gets a page.
- The detail page calls `notFound()` as a backstop for a posting that
  expires between builds.
- `getRecentlyExpiredSlugs()` returns the slugs the 410 layer needs, since
  `getJobs()` no longer returns them.
- The sitemap lists live postings only.

**What is not wired, and why.** A page component cannot set a status code in
Next, so a real 410 has to come from middleware or a host rule - both of
which are server code, and this repo is deliberately backend-free (see the
top of this file). That is a decision to take deliberately rather than by
accident, so it is deferred until there are postings that can expire. With
`getJobs()` returning nothing, nothing can. When jobs land, wire ONE of:

1. `src/middleware.ts` matching `/jobs/:slug`, answering 410 for anything in
   `getRecentlyExpiredSlugs()`; or
2. generated `[[redirects]]` in `netlify.toml` with `status = 410`, built
   from the same list.

Whichever, the list comes from `getRecentlyExpiredSlugs()` and nowhere else.

## check:seo assertions for a live posting

**Add when real postings exist**, against a live posting URL:

- exactly one `<script type="application/ld+json">`, and it parses;
- `@type` is `JobPosting`, with `title`, `description`, `datePosted`,
  `validThrough`, `hiringOrganization` and `jobLocation` all present;
- `baseSalary` is present with a min, a max and a `unitText` - the pay range
  is the promise this site makes, and the type enforces it in code, so the
  served HTML should be checked too;
- `validThrough` parses and is in the future;
- the posting appears in the sitemap, and an expired one answers 410.
