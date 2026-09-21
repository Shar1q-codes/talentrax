/**
 * Navigation tree: primary nav, utility (sign-in/register), footer columns,
 * and the registry of every coming-soon route.
 *
 * CONTENT RULE: Header, MobileDrawer and Footer map over these arrays. Adding
 * a link is a data edit, never a component edit.
 *
 * ROUTE RULE: every href below must resolve - a route under src/app, or an
 * anchor on a built page. All 20 routes exist today. Built: "/",
 * "/employers", "/employers/services", "/employers/request-talent",
 * "/job-seekers", "/job-seekers/upload-resume", "/jobs", "/about",
 * "/contact", "/faq", "/accessibility", "/privacy-policy" and "/terms",
 * plus the /jobs/[slug] detail route, which generates a page per posting and
 * so generates none today. The other 5 render the shared ComingSoon page,
 * are noindex, and are registered in `comingSoonRoutes` below.
 *
 * /industries, /specialties and /research have been DELETED, not hidden.
 * Nothing linked to the first two and their subject was already built at
 * /employers#specialties; the third was a statistics product, which the
 * content rules do not allow. All three were noindex and unlinked, so no
 * redirects are needed and none were added.
 */

export type NavLink = {
  label: string;
  href: string;
  /** Optional one-line gloss shown inside desktop dropdowns. */
  description?: string;
};

export type NavItem = {
  /** Stable id, used for aria-controls / aria-labelledby wiring. */
  id: string;
  label: string;
  /** Where the top-level label itself points. */
  href: string;
  /** When present the item renders as a disclosure with a dropdown panel. */
  children?: NavLink[];
};

export type FooterColumn = {
  id: string;
  title: string;
  links: NavLink[];
};

/** Five primary items; three carry dropdowns. */
export const primaryNav: NavItem[] = [
  {
    id: "nav-employers",
    label: "Employers",
    href: "/employers",
    children: [
      {
        label: "Overview",
        href: "/employers",
        description: "How we work, and what you see at each step",
      },
      {
        label: "Services",
        href: "/employers/services",
        description: "The three engagement models, in detail",
      },
      // One entry, not two: "Industries" and "Specialties" both described
      // the desks, and the desks are now a real section on /employers. Two
      // nav items pointing at the same anchor would be a worse answer than
      // one. The /industries and /specialties routes still exist.
      {
        label: "Specialties",
        href: "/employers#specialties",
        description: "The three desks and what sits on each",
      },
      {
        label: "Request Talent",
        href: "/employers/request-talent",
        description: "Send us a requisition and get a named recruiter",
      },
    ],
  },
  {
    id: "nav-job-seekers",
    label: "Job Seekers",
    href: "/job-seekers",
    children: [
      {
        label: "Overview",
        href: "/job-seekers",
        description: "How applying works, start to answer",
      },
      {
        label: "Browse Jobs",
        href: "/jobs",
        description: "Current openings across our desks",
      },
      {
        label: "Locations",
        href: "/locations",
        description: "Markets we place candidates in",
      },
      {
        label: "Resources",
        href: "/resources",
        description: "Interview and resume guidance",
      },
      {
        label: "Upload Resume",
        href: "/job-seekers/upload-resume",
        description: "One upload, read by a specialist recruiter",
      },
    ],
  },
  {
    id: "nav-jobs",
    label: "Jobs",
    href: "/jobs",
  },
  // No children: the dropdown was down to "Articles", which pointed at this
  // same page, and FAQ, which sits with the other company pages below. A
  // disclosure that opens onto a link to itself is worse than no disclosure.
  {
    id: "nav-insights",
    label: "Insights",
    href: "/insights",
  },
  {
    id: "nav-about",
    label: "About",
    href: "/about",
    children: [
      {
        label: "About Us",
        href: "/about",
        description: "Who we are and how we work",
      },
      {
        label: "Contact",
        href: "/contact",
        description: "Reach the right team directly",
      },
      {
        label: "FAQ",
        href: "/faq",
        description: "Common questions, answered",
      },
    ],
  },
];

/** Right-hand side of the header. */
export const utilityNav: { signIn: NavLink; register: NavLink } = {
  signIn: { label: "Sign In", href: "/login" },
  register: { label: "Register", href: "/register" },
};

export const footerColumns: FooterColumn[] = [
  {
    id: "footer-employers",
    title: "Employers",
    links: [
      { label: "Overview", href: "/employers" },
      { label: "Services", href: "/employers/services" },
      { label: "Specialties", href: "/employers#specialties" },
      { label: "Request Talent", href: "/employers/request-talent" },
    ],
  },
  {
    id: "footer-job-seekers",
    title: "Job Seekers",
    links: [
      { label: "Overview", href: "/job-seekers" },
      { label: "Browse Jobs", href: "/jobs" },
      { label: "Locations", href: "/locations" },
      { label: "Resources", href: "/resources" },
      { label: "Upload Resume", href: "/job-seekers/upload-resume" },
    ],
  },
  {
    id: "footer-company",
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Insights", href: "/insights" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    id: "footer-legal",
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms", href: "/terms" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
];

/**
 * Registry of every route that currently renders the shared ComingSoon page.
 * "/", the three Employers routes, the two Job Seekers routes, /jobs,
 * /about, /contact and the two legal routes are excluded because they are
 * built.
 *
 * Each entry drives three things for its route: the page h1, the document
 * title, and the meta description. Route files stay three-line stubs.
 */
export type ComingSoonRoute = {
  href: string;
  title: string;
  description: string;
  /** Section label shown as an eyebrow above the h1. */
  section: string;
};

export const comingSoonRoutes: ComingSoonRoute[] = [
  {
    href: "/locations",
    title: "Locations",
    section: "Job Seekers",
    description:
      "The US markets where Talentrax Global places contract and permanent talent.",
  },
  {
    href: "/insights",
    title: "Insights",
    section: "Insights",
    description:
      "Hiring, workforce and labor market commentary from the Talentrax Global recruiting team.",
  },
  {
    href: "/resources",
    title: "Resources",
    section: "Insights",
    description:
      "Interview preparation, resume guidance and hiring advice from Talentrax Global recruiters.",
  },
  {
    href: "/login",
    title: "Sign In",
    section: "Account",
    description: "Sign in to the Talentrax Global candidate and client portal.",
  },
  {
    href: "/register",
    title: "Register",
    section: "Account",
    description:
      "Create a Talentrax Global account to track applications and submitted roles.",
  },
];

/** Lookup helper so each coming-soon route file stays a short stub. */
export function getComingSoonRoute(href: string): ComingSoonRoute {
  const match = comingSoonRoutes.find((route) => route.href === href);
  if (!match) {
    throw new Error(
      `No coming-soon content registered for "${href}". Add it to comingSoonRoutes in src/content/navigation.ts.`,
    );
  }
  return match;
}
