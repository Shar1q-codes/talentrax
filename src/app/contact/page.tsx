import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/ContactForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, SectionHeader } from "@/components/ui/Section";
import { contactForm, contactHero, contactMeta, intents } from "@/content/contact";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: contactMeta.title,
  description: contactMeta.description,
  path: "/contact",
});

/**
 * Contact.
 *
 * NO CONTACT DETAILS ARE RENDERED - no email, no phone, no address, and no
 * "to be confirmed" line standing in for one. None of them exist yet
 * (everything in content/site.ts is still isPlaceholder) and inventing a
 * contact route on the contact page is the worst place to invent one. Rule 5:
 * absent, not approximated. CLIENT-CONFIRM.md item 8.
 *
 * The two intents that actually bring people here - an employer with a role,
 * a candidate with a resume - are routed to their own forms first. The
 * general form underneath is for everything else, which is what a contact
 * form is good at and what a requisition form is not.
 *
 * No map, no office photography, no business-hours block: none are confirmed
 * and the site loads no external assets anyway.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={contactHero.eyebrow}
        heading={contactHero.heading}
        intro={contactHero.intro}
      />

      <Section id="intents" labelledBy="intents-heading">
        <SectionHeader headingId="intents-heading" heading={intents.heading} />

        <ul className="grid gap-6 lg:grid-cols-2">
          {intents.cards.map((card) => (
            <Card as="li" key={card.id} className="flex flex-col">
              <h3 className="text-xl font-bold text-ink">{card.title}</h3>
              <p className="mt-3 flex-1 text-base text-ink-muted">
                {card.description}
              </p>
              <div className="mt-6">
                <ButtonLink href={card.href} variant="primary">
                  {card.linkLabel}
                </ButtonLink>
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      <Section id="contact-form" tone="muted" labelledBy="contact-form-heading">
        <SectionHeader
          headingId="contact-form-heading"
          heading={contactForm.heading}
          intro={contactForm.intro}
        />
        <div className="max-w-3xl">
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
