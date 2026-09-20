import { SITE_URL, site } from "@/content/site";

/**
 * JSON-LD builders. Rendered server-side on the home page only (see
 * src/app/page.tsx). Nothing here reads request state, so the output is
 * part of the static HTML.
 *
 * HONESTY RULE: fields sourced from placeholder data are omitted rather than
 * published. Shipping an invented phone number or postal address inside
 * schema.org markup would be a machine-readable false claim, so contact
 * fields only appear once `isPlaceholder` flips to false in content/site.ts.
 */

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLd = Record<string, JsonLdValue>;

export function organizationJsonLd(): JsonLd {
  const contactPoint: JsonLd = {
    "@type": "ContactPoint",
    contactType: "customer service",
    areaServed: "US",
    availableLanguage: "English",
  };

  if (!site.contact.email.isPlaceholder) {
    contactPoint.email = site.contact.email.display;
  }
  if (!site.contact.phone.isPlaceholder) {
    contactPoint.telephone = site.contact.phone.display;
  }

  const hasRealContact =
    !site.contact.email.isPlaceholder || !site.contact.phone.isPlaceholder;

  const organization: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: site.name,
    legalName: site.legalName,
    url: SITE_URL,
    description: site.description,
    knowsAbout: [
      "Healthcare staffing",
      "Information technology staffing",
      "Professional staffing",
      "Recruitment process outsourcing",
      "Executive search",
    ],
  };

  if (hasRealContact) {
    organization.contactPoint = [contactPoint];
  }
  if (site.social.length > 0) {
    organization.sameAs = site.social.map((profile) => profile.href);
  }

  return organization;
}

export function webSiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: site.name,
    description: site.description,
    inLanguage: site.locale,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/**
 * Serialises JSON-LD for a <script> tag. Escapes "<" to its unicode form so a
 * string in the payload can never break out of the script element, per the
 * Next.js JSON-LD guidance.
 */
export function serializeJsonLd(payload: JsonLd | JsonLd[]): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}
