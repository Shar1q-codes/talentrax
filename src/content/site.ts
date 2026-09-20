/**
 * Site-wide identity, contact and social data.
 *
 * CONTENT RULE: this file is the single source of truth for company-level
 * facts. Components import from here; nothing is typed inline in JSX.
 * When the CMS lands, only the export bodies below change shape/source.
 *
 * PLACEHOLDER POLICY: anything the client has not supplied yet carries
 * `isPlaceholder: true`. Code that emits machine-readable data (JSON-LD,
 * sitemap) skips placeholder values rather than publishing invented facts.
 */

export type ContactValue = {
  /** Human-readable text rendered in the UI. */
  display: string;
  /** `tel:` / `mailto:` target, or null when not linkable. */
  href: string | null;
  /** True until the client confirms the real value. */
  isPlaceholder: boolean;
};

export type SocialLink = {
  label: string;
  href: string;
};

export type SiteConfig = {
  name: string;
  legalName: string;
  tagline: string;
  /** Default meta description; individual routes override this. */
  description: string;
  /** Absolute origin, no trailing slash. Drives canonicals + metadataBase. */
  url: string;
  locale: string;
  foundingCopyrightYear: number;
  contact: {
    phone: ContactValue;
    email: ContactValue;
    address: ContactValue;
    hours: ContactValue;
  };
  /**
   * Intentionally empty. Real profile URLs are client-supplied; inventing
   * them would ship dead links and false `sameAs` claims in JSON-LD.
   * The footer renders this block only when the array is non-empty.
   */
  social: SocialLink[];
};

/**
 * Origin resolution. Set NEXT_PUBLIC_SITE_URL in the deploy environment.
 * Falls back to localhost so `next build` and local dev work untouched.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const site: SiteConfig = {
  name: "Talentrax Global",
  legalName: "Talentrax Global",
  tagline: "Staffing and recruiting for healthcare, IT and professional teams",
  description:
    "Talentrax Global is a US staffing and recruiting firm placing healthcare, IT and professional talent through direct hire, contract, contract-to-hire, RPO and executive search.",
  url: SITE_URL,
  locale: "en-US",
  foundingCopyrightYear: 2026,

  contact: {
    // PLACEHOLDER - 555 numbers are reserved for fictional use.
    phone: {
      display: "(555) 018-2200",
      href: "tel:+15550182200",
      isPlaceholder: true,
    },
    // PLACEHOLDER - mailbox not provisioned yet.
    email: {
      display: "hello@talentraxglobal.com",
      href: "mailto:hello@talentraxglobal.com",
      isPlaceholder: true,
    },
    // PLACEHOLDER - no address invented; awaiting client HQ details.
    address: {
      display: "Headquarters address to be confirmed",
      href: null,
      isPlaceholder: true,
    },
    hours: {
      display: "Monday to Friday, 8:00am - 6:00pm CT",
      href: null,
      isPlaceholder: true,
    },
  },

  social: [],
};
