import type { Metadata } from "next";

import { RequestTalentForm } from "@/features/employers";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { NotOpenNotice } from "@/components/ui/NotOpenNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { employersMeta } from "@/content/employers";
import { requestTalent } from "@/content/request-talent";
import { buildMetadata } from "@/lib/metadata";
import { publicFormsOpen } from "@/lib/supabase/forms-gate";

export const metadata: Metadata = buildMetadata({
  title: employersMeta.requestTalent.title,
  description: employersMeta.requestTalent.description,
  path: "/employers/request-talent",
});

/**
 * The requisition form page. The page itself is a server component: only the
 * form below is a client component, so everything above it - including the
 * h1, the intro and the metadata - is in the server-rendered HTML.
 *
 * Whether the form is open is decided once, at build time, by the forms gate
 * (src/lib/supabase/forms-gate.ts). The notice and the form's own behaviour
 * both follow that one answer.
 */
export default function Page() {
  const open = publicFormsOpen();
  return (
    <>
      <PageHeader
        eyebrow={requestTalent.eyebrow}
        heading={requestTalent.heading}
        intro={requestTalent.intro}
      >
        {open ? null : <NotOpenNotice>{requestTalent.notOpen.notice}</NotOpenNotice>}
        <ul className="mt-8 flex flex-col gap-2">
          {requestTalent.beforeYouStart.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-base text-ink-muted"
            >
              <Icon name="check" className="mt-1.5 h-4 w-4 shrink-0 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </PageHeader>

      <Container>
        <div className="max-w-3xl py-14 sm:py-16 lg:py-20">
          <RequestTalentForm open={open} />
        </div>
      </Container>
    </>
  );
}
