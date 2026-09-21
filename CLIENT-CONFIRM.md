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
   *Omitted: the footer contact block, and every contact detail on
   `/contact`. The page is a form and two links until these exist.*

11. **Business hours.** If there are published hours, what are they, and in
    which timezone? `/contact` shows none.
    *Omitted: any hours block.*

9. **Commercial terms.** `/employers/services` describes how each engagement
   model is charged but publishes no fee, rate, percentage or guarantee
   period. Those points carry `detail: null` in `src/content/taxonomy.ts` and
   render nothing. Each one is a question: direct-hire fee percentage and
   replacement guarantee; contract bill rate and margin; executive search
   retainer structure and off-limits period.

10. **The copy itself.** Every word on this site is placeholder marketing copy
    written during the build, not approved client copy. The process sections
    on `/employers` and `/job-seekers` make specific operational promises — a
    named recruiter, consent before every submission, an answer either way,
    terms in writing before a search opens. They read well because they are
    concrete, which also means the business has to actually do them. They need
    sign-off from someone who can commit the company to them.
