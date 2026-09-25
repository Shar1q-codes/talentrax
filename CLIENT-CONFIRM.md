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

17. **The imported insights articles.** Thirty articles were imported from
    the client's documents by `scripts/import-articles.ts` (see CLAUDE.md,
    "The insights index"). Four things in them need a decision:
    - **Dates.** Every document says "Last updated" with a month between
      October 2026 and March 2027, all later than the import. A future
      `datePublished` is wrong in BlogPosting markup, so each article carries
      the import date instead. Several are written from that future vantage
      point ("As of January 2027, employers using AI in hiring face...",
      "Healthcare Hiring Trends for 2027"). Confirm whether they publish now
      as written, or are held to the month each was written for.
    - **Internal links.** Links between the articles, and to pages this
      site has, are live in the text. The documents also link to
      `/employers/how-we-work` (13 times) and
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
      publish their next editions.
    *Omitted: nothing - every article is on the site as written, minus the
    items above.*
