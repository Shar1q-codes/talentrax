import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { ComingSoonRoute } from "@/content/navigation";

/**
 * The single shared coming-soon page body, used by all 5 unbuilt routes.
 *
 * It renders inside the root layout, so the real header and footer stay in
 * place and the site still feels whole while sections are being built.
 *
 * Each route supplies its content from the `comingSoonRoutes` registry in
 * content/navigation.ts, and sets robots index:false via buildMetadata.
 */
export function ComingSoon({ route }: { route: ComingSoonRoute }) {
  return (
    <Container>
      <div className="mx-auto max-w-2xl py-20 sm:py-28 lg:py-32">
        <p className="text-sm font-semibold tracking-widest text-accent uppercase">
          {route.section}
        </p>

        {/* The one h1 for this route. */}
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {route.title}
        </h1>

        <p className="mt-6 text-lg text-ink-muted">
          This section is coming soon.
        </p>

        <p className="mt-4 text-base text-ink-muted">{route.description}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" variant="primary">
            Back to home
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-base text-ink-muted">
          Looking for something specific?{" "}
          <TextLink href="/contact">Get in touch</TextLink> and we will point
          you to the right person.
        </p>
      </div>
    </Container>
  );
}
