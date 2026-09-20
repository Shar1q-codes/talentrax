import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { split } from "@/content/home";

/**
 * Two-column audience split: employers on one side, job seekers on the other.
 *
 * The region gets an aria-label because it has no visible heading of its own -
 * each panel carries its own <h2>. Without the label the landmark would be
 * announced as an unnamed region.
 */
export function SplitSection() {
  return (
    <section aria-label={split.ariaLabel} className="bg-surface">
      <Container>
        <div className="grid gap-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-24">
          {split.panels.map((panel, index) => {
            // Alternate the surface so the two paths read as distinct
            // choices rather than one continuous block of text.
            const isBrandPanel = index === 0;

            return (
              <div
                key={panel.id}
                className={[
                  "flex flex-col rounded-xl border p-8 lg:p-10",
                  isBrandPanel
                    ? "on-brand border-brand bg-surface-brand text-on-brand"
                    : "border-border bg-surface-muted text-ink",
                ].join(" ")}
              >
                <p
                  className={`text-sm font-semibold tracking-widest uppercase ${
                    isBrandPanel ? "text-on-brand-muted" : "text-accent"
                  }`}
                >
                  {panel.eyebrow}
                </p>
                <h2
                  className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${
                    isBrandPanel ? "text-on-brand" : "text-ink"
                  }`}
                >
                  {panel.title}
                </h2>
                <p
                  className={`mt-4 text-lg ${
                    isBrandPanel ? "text-on-brand-muted" : "text-ink-muted"
                  }`}
                >
                  {panel.description}
                </p>

                <ul className="mt-8 flex flex-1 flex-col gap-4">
                  {panel.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <Icon
                        name="check"
                        className={`mt-1 h-5 w-5 shrink-0 ${
                          isBrandPanel ? "text-on-brand-muted" : "text-accent"
                        }`}
                      />
                      <span
                        className={`text-base ${
                          isBrandPanel ? "text-on-brand" : "text-ink-muted"
                        }`}
                      >
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <ButtonLink
                    href={panel.cta.href}
                    variant={isBrandPanel ? "inverse" : "primary"}
                  >
                    {panel.cta.label}
                  </ButtonLink>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
