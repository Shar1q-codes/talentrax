# Needs a client answer

Facts this repo cannot derive from its own code. Nothing below has been
guessed at, approximated or written as a placeholder: the sentence that would
have carried each one is simply missing from the page, and stays missing until
someone with the authority to answer does.

> **Release gate.** `/job-seekers/upload-resume` must not be publicly
> reachable until every privacy-policy item below is answered **and** the
> policy has been through the client's lawyer. It is a form that collects
> resumes, contact details and work-authorization status from real people. A
> privacy policy written by the people who built the form is a starting draft
> for a lawyer, not a published policy, and collecting that data without one
> that is accurate is the kind of mistake that is expensive in every sense.
>
> Until then: keep the route out of `BUILT_ROUTES`, or keep the site behind an
> access control. Today the route is live and indexable, which is fine only
> while the forms transmit nothing (there is no backend yet) — that stops
> being true the moment `submitApplication()` is wired up.

When an item is answered, write the sentence into `src/content/legal.ts`,
delete the matching `OMITTED` comment there, and strike the item here.

## Privacy policy — needs client answer

1. **Retention.** How long is a candidate's resume and contact details kept
   when they are not placed? How long after a placement? How long is employer
   requisition data kept? Is there a deletion schedule, or is it on request
   only?
   *Omitted: the whole "How long we keep it" section.*

2. **Processors.** Which third parties will receive this data, by legal entity
   name — applicant tracking system, CRM, email provider, file/object storage,
   e-signature, background-screening vendor? The policy has to name them or
   name their categories.
   *Omitted: the service-provider half of "Who we share it with".*

3. **Data-rights contact.** Which email address and postal address should
   someone use to ask what we hold, get a copy, correct it, or have it
   deleted? Who owns that inbox, and what response time will the client
   commit to? **This is the most urgent item:** the policy currently states
   rights with no way to exercise them, because every contact detail in
   `src/content/site.ts` is still `isPlaceholder: true`.
   *Omitted: the whole "How to contact us about your data" section, and the
   how-to sentences in "Consent and your choices" and "Your rights".*

4. **International transfers.** Are resumes or requisition data ever stored,
   accessed or processed outside the United States — offshore recruiters,
   offshore support staff, a non-US cloud region? If so, which countries?
   *Omitted: any statement about transfers.*

5. **Hosting and server logs.** Which provider serves the production site, and
   what do its access logs retain (IP address, user agent), for how long, and
   who can read them? The site itself sets no cookies and runs no analytics —
   this is only about what the host records.
   *Omitted: the server-log sentence in "What we collect".*

6. **Sale and sharing.** Does the business sell personal information, or share
   it for cross-context behavioural advertising, as those terms are defined
   under California and other US state privacy law? Which state privacy laws
   does the client need this policy to satisfy?
   *Omitted: the mandatory sale/sharing disclosure.*

## Terms of use — needs client answer

7. **Governing law and venue.** Which state's law governs these terms, and
   where are disputes heard?
   *Omitted: the whole "Governing law" section.*

## Elsewhere on the site

8. **Contact details.** Phone, email, address and business hours in
   `src/content/site.ts` are all `isPlaceholder: true`. The 555 phone number
   is a reserved fictional number and the mailbox is not provisioned. Nothing
   renders any of them now: JSON-LD and the sitemap already skipped them, the
   footer contact block no longer appears at all, and `/contact` publishes no
   address of any kind. Real values also answer item 3, and give
   `submitContact()` somewhere to deliver to.
   Business hours belong here too: if there are published hours, what are
   they and in which timezone?
   *Omitted: the footer contact block, every contact detail on `/contact`,
   and any hours block. That page is a form and two links until these exist.*

9. **Commercial terms.** `/employers/services` describes how each engagement
   model is charged but publishes no fee, rate, percentage or guarantee
   period. Those points carry `detail: null` in `src/content/taxonomy.ts` and
   render nothing. Each one is a question: direct-hire fee percentage and
   replacement guarantee; contract bill rate and margin; executive search
   retainer structure and off-limits period.

10. **Questions the FAQ cannot answer.** Each of these is a question people
    genuinely ask, with no answer anywhere in this repo, so it is **not on
    /faq**. Answer one and it goes on the page.
    - How quickly does someone reply to a resume, a requisition or a contact
      message? There is no service level stated anywhere and none was
      invented.
    - Do you place outside the United States? `/about` says "across the
      United States" and nothing about anywhere else.
    - How long is a resume kept? Same as item 1.
    - How does someone reach you to exercise a data right? Same as item 3.
    - Where are you based, and what are your hours? Items 8 and 11.
    - What does it cost? Item 9, and deliberately out of scope for an FAQ
      until the terms exist.

11. **Accessibility barrier reports.** Which address should accessibility
    problems go to, and who monitors it? `/accessibility` currently routes
    people to the contact form, which works but is not a dedicated channel.
    A named accessibility contact is also what most procurement and public
    sector RFPs ask for.
    *Omitted: any accessibility-specific email or phone number.*

12. **An accessibility audit.** `/accessibility` states plainly that the site
    has not been independently audited and has not been tested with assistive
    technology, because it has not. That sentence should be replaced with a
    real conformance statement only after a real audit - not before, and not
    by anyone writing marketing copy. Until then **nobody may add the words
    "compliant" or "conformant" to that page.**

13. **Per-market landing pages.** Does the client want location landing
    pages later, and if so for which markets specifically?

    `/locations` deliberately publishes no market list, no cities and no
    states. If per-market pages are wanted, each one needs **real
    differentiated content** - the employers and role types that market
    actually has, what hiring there is like, why a candidate there should
    read it. A state name swapped into a template is a thin page, fifty of
    them is a thin-content problem, and this site deleted `/specialties`
    over exactly that. So the question is not "which states" but "which
    markets do you know enough about to write a real page for".
    *Omitted: every market, city, state and region name on the site.*

14. **Password and session policy.** The register form states a minimum
    password length and checks it, but that is a courtesy to the person
    typing, **not a security control** - the server has to enforce its own.
    Nobody has set one. Needed before auth is wired:
    - Minimum password length the backend will enforce. The page currently
      says twelve characters; if the backend disagrees, the page changes.
    - Session lifetime, idle timeout, and whether sessions persist across
      browser restarts. There is deliberately no "remember me" checkbox
      because that is this decision, not a UI preference.
    - Whether multi-factor authentication is wanted for candidate accounts.
    - Lockout and rate-limiting thresholds for failed sign-ins. These cannot
      be done client-side at all.
    *Omitted: any strength meter, any "remember me", any claim about session
    behaviour.*

15. **What a candidate account is actually for.** `/register` says an account
    "keeps your details current with the desk that recruits your discipline",
    which is the least it could plausibly do. What does the client want it to
    do - track applications, see which employers hold a resume, withdraw an
    application, set availability? That answers whether the account is worth
    building at all, given the resume form already works without one.

16. **The copy itself.** Every word on this site is placeholder marketing copy
    written during the build, not approved client copy. The process sections
    on `/employers` and `/job-seekers` make specific operational promises — a
    named recruiter, consent before every submission, an answer either way,
    terms in writing before a search opens. They read well because they are
    concrete, which also means the business has to actually do them. They need
    sign-off from someone who can commit the company to them.

17. **The imported insights articles.** Forty articles were imported from
    the client's documents by `scripts/import-articles.ts` (see CLAUDE.md,
    "The insights index"): thirty healthcare and hiring articles, then ten
    non-IT articles (manufacturing, supply chain, accounting, admin and HR).
    Five things in them need a decision:
    - **Dates.** Every document says "Last updated" with a month between
      October 2026 and March 2027, all later than the import. A future
      `datePublished` is wrong in BlogPosting markup, so each article carries
      the import date instead: 2026-09-25 for the first thirty, 2026-09-30
      for the ten non-IT articles, all stated as October 2026. Several are
      written from that future vantage
      point ("As of January 2027, employers using AI in hiring face...",
      "Healthcare Hiring Trends for 2027", and the pay transparency
      article's "As of October 2026" state list). Confirm whether they publish now
      as written, or are held to the month each was written for. Until
      there is a real publication schedule no date is shown on any article
      page; the dates stay in the structured data only.
    - **Internal links.** Links between the articles, and to pages this
      site has, are live in the text. The documents also link to
      `/employers/how-we-work` (14 times) and
      `/employers/healthcare/{nursing,allied-health,non-clinical}`, none of
      which exist on this site; those hrefs were dropped and the link text
      stays as plain prose. The closing "tell us about it" call-to-action
      paragraphs were dropped entirely. Confirm where the missing targets
      should point (`/employers#how-a-search-runs` is the nearest existing
      page for "how we work"), or that the site's own CTA band is enough.
    - **The byline.** Every document carries "By [Author name], [Title]".
      It was dropped, not filled: nobody is named anywhere on this site. If
      the client wants attribution that is a deliberate decision (see
      CLAUDE.md, "The insights index").
    - **Third-party figures.** The articles cite BLS, HRSA, NSI, AHA and
      others, preserved exactly with their sources linked. Confirm the client
      is content to publish cited statistics on a site whose own copy carries
      none, and that someone will re-check the figures when the sources
      publish their next editions. The pay transparency article summarises
      state-by-state legal requirements with effective dates; it carries a
      "not legal advice" line and cites law-firm sources, but it goes stale
      whenever a state changes its law.
    - **Desks.** The ten non-IT articles are not mapped to a desk in
      `taxonomy.ts`. Manufacturing and supply chain do not sit cleanly under
      Healthcare, Technology or Professional; confirm whether they belong
      under Professional, need a desk of their own, or stay untagged.
    *Omitted: nothing - every article is on the site as written, minus the
    items above.*

## ATS database — needs client answer

18. **Workflow vocabularies and audit retention.** The site defines the
    desks, specialties, engagement models, work modes and states, and the
    database is seeded from them. It does not define the steps of the
    recruiting process, so `supabase/migrations/20261001000100_foundation.sql`
    seeds working defaults the client has not seen:
    - **Job statuses:** draft, published, paused, closed.
    - **Lead statuses:** new, contacted, qualified, converted, disqualified.
    - **Candidate statuses:** new, active, placed, inactive, do-not-contact.
    - **Submission statuses:** draft, pending BDM review, approved, sent to
      employer, interviewing, offered, placed, rejected, withdrawn.
    These are editable rows, not code. The ones the schema's own rules name
    (draft, published, closed, new, do-not-contact, and the four submission
    statuses from "sent to employer" onward) are fixed. Confirm the rest,
    or supply the client's own.
    - **Audit retention.** `audit_settings.retention_days` is NULL: the audit
      log is kept indefinitely and nothing purges it. How long must it be
      kept, and is there a point after which it must be deleted? This is the
      same question as item 1, asked of the audit trail.
    *Omitted: any purge job, and any retention period.*

19. **Federal contracts.** Does Talentrax hold, or expect to hold, a federal
    contract or subcontract (including as a subcontractor placing staff with
    a federal contractor)? If so, OFCCP record retention applies:
    [41 CFR 60-1.12](https://www.law.cornell.edu/cfr/text/41/60-1.12), two
    years at 150+ employees and a $150,000 contract, otherwise one. The
    `ofccp-federal-contractor` retention rule is seeded **inactive** until
    this is answered.
    *Omitted: OFCCP retention.*

20. **Where Talentrax operates, and which state laws bind it.** California
    requires employment agencies to keep applications and referral records
    for four years ([Gov. Code §12946](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=12946)).
    The schema applies that only to candidates linked to California. If the
    agency itself is in California, counsel may say it applies to every
    candidate. Which other states does Talentrax place into, and do any
    impose a longer floor?
    *Assumed: FEHA for California-linked candidates only.*

21. **Employer of record on Contract engagements.** Is Talentrax the W-2
    employer of contract workers, or does the client employ them? If
    Talentrax employs them, it owes payroll records (three years,
    [29 CFR 516.5](https://www.law.cornell.edu/cfr/text/29/516.5)), Form
    I-9s, and wage-rate history under California, Colorado and Illinois law.
    None of that is in this schema, and it would need its own system and
    its own retention rules.
    *Omitted: any payroll or employee record.*

22. **Does the CCPA apply?** It binds businesses over its revenue or data
    thresholds ([Civ. Code §1798.140(d)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140)).
    The deletion path is built to its standard either way, because
    /privacy-policy promises deletion to everyone. Which privacy laws
    actually apply changes the response deadline and what must be disclosed
    on refusal.

23. **Counsel review of the erasure design.** `supabase/ERASURE.md` is an
    engineering reading, not legal advice. Specifically:
    - Is a recruiter-sourced profile an agency record under
      [29 CFR 1627.4(a)](https://www.law.cornell.edu/cfr/text/29/1627.4)?
      The schema assumes yes, which gives every candidate a floor of at
      least one year.
    - May submissions, offers and placements be kept, anonymised, after the
      floor, as the employer's transaction and the basis of a fee?
    - Should a suppression list survive erasure, so a person who opted out
      is not contacted again if re-sourced? Today nothing survives.
    - Which legal-hold triggers does the client recognise?

24. **Which file types candidates may upload.** All three buckets accept
    PDF, DOC and DOCX up to 5 MB, the resume form's own limits. The schema
    also allows certifications and other documents, which in practice are
    often photos or scans. Should those buckets accept images, and up to
    what size?
    *Assumed: the resume form's limits everywhere.*

25. **Rate limits on the public forms.** Seeded as engineering defaults in
    `intake_limits`: 20 submissions an hour per client address (generous,
    because hospital networks and mobile carriers put many people behind one
    address), 3 resumes or 5 messages or leads a day per email address (held
    for review, never refused), and 300 an hour per form overall. Do these
    fit the volume the client expects, especially around hiring events or a
    campaign?
    *Assumed: the defaults above.*
