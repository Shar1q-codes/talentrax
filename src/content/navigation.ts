/**
 * Navigation tree: primary nav, utility (sign-in/register), footer columns,
 * and the registry of every coming-soon route.
 *
 * CONTENT RULE: Header, MobileDrawer and Footer map over these arrays. Adding
 * a link is a data edit, never a component edit.
 *
 * ROUTE RULE: every href below must correspond to a real route under src/app.
 * All 20 routes exist today; only "/" has real content, the rest render the
 * shared ComingSoon page and are noindex.
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
        description: "How we partner with hiring teams",
      },
      {
        label: "Services",
        href: "/employers/services",
        description: "Direct hire, contract, RPO and search",
      },
      {
        label: "Industries",
        href: "/industries",
        description: "Sectors we staff across the US",
      },
      {
        label: "Specialties",
        href: "/specialties",
        description: "Roles and disciplines we recruit for",
      },
      {
        label: "Request Talent",
        href: "/employers/request-talent",
        description: "Brief us on an open role",
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
        description: "What working with a recruiter looks like",
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
        description: "Get on our recruiters radar",
      },
    ],
  },
  {
    id: "nav-jobs",
    label: "Jobs",
    href: "/jobs",
  },
  {
    id: "nav-insights",
    label: "Insights",
    href: "/insights",
    children: [
      {
        label: "Articles",
        href: "/insights",
        description: "Hiring and workforce commentary",
      },
      {
        label: "Research & Hiring Index",
        href: "/research",
        description: "Our periodic labor market read",
      },
      {
        label: "Salary Guides",
        href: "/resources",
        description: "Compensation benchmarks by specialty",
      },
      {
        label: "FAQ",
        href: "/faq",
        description: "Common questions, answered",
      },
    ],
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
      { label: "Industries", href: "/industries" },
      { label: "Specialties", href: "/specialties" },
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
      { label: "Research & Hiring Index", href: "/research" },
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
 * "/" is excluded because it is fully built.
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
    href: "/employers",
    title: "For Employers",
    section: "Employers",
    description:
      "How Talentrax Global partners with hiring teams across healthcare, IT and professional staffing.",
  },
  {
    href: "/employers/services",
    title: "Staffing Services",
    section: "Employers",
    description:
      "Direct hire, contract, contract-to-hire, RPO and executive search engagements from Talentrax Global.",
  },
  {
    href: "/employers/request-talent",
    title: "Request Talent",
    section: "Employers",
    description:
      "Brief the Talentrax Global team on an open role and get matched with a specialist recruiter.",
  },
  {
    href: "/industries",
    title: "Industries",
    section: "Employers",
    description:
      "The sectors Talentrax Global staffs across the United States, from health systems to enterprise IT.",
  },
  {
    href: "/specialties",
    title: "Specialties",
    section: "Employers",
    description:
      "The roles and disciplines Talentrax Global recruits for across healthcare, IT and professional services.",
  },
  {
    href: "/job-seekers",
    title: "For Job Seekers",
    section: "Job Seekers",
    description:
      "What working with a Talentrax Global recruiter looks like, from first call to first day.",
  },
  {
    href: "/job-seekers/upload-resume",
    title: "Upload Your Resume",
    section: "Job Seekers",
    description:
      "Send your resume to the Talentrax Global recruiting team and get on our radar for matching roles.",
  },
  {
    href: "/jobs",
    title: "Browse Jobs",
    section: "Job Seekers",
    description:
      "Search current openings across the healthcare, IT and professional desks at Talentrax Global.",
  },
  {
    href: "/locations",
    title: "Locations",
    section: "Job Seekers",
    description:
      "The US markets where Talentrax Global places contract, contract-to-hire and permanent talent.",
  },
  {
    href: "/insights",
    title: "Insights",
    section: "Insights",
    description:
      "Hiring, workforce and labor market commentary from the Talentrax Global recruiting team.",
  },
  {
    href: "/research",
    title: "Research & Hiring Index",
    section: "Insights",
    description:
      "The Talentrax Global periodic read on hiring demand, time to fill and compensation movement.",
  },
  {
    href: "/resources",
    title: "Resources",
    section: "Insights",
    description:
      "Salary guides, interview preparation and resume guidance from Talentrax Global recruiters.",
  },
  {
    href: "/faq",
    title: "Frequently Asked Questions",
    section: "Insights",
    description:
      "Common questions about working with Talentrax Global as an employer or as a candidate.",
  },
  {
    href: "/about",
    title: "About Us",
    section: "Company",
    description:
      "Who Talentrax Global is, how our recruiting desks are organized and how we measure a good placement.",
  },
  {
    href: "/contact",
    title: "Contact Us",
    section: "Company",
    description:
      "Reach the Talentrax Global team about an open role, an application or a partnership.",
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
  {
    href: "/privacy-policy",
    title: "Privacy Policy",
    section: "Legal",
    description:
      "How Talentrax Global collects, uses and protects personal information.",
  },
  {
    href: "/terms",
    title: "Terms of Use",
    section: "Legal",
    description:
      "The terms governing use of the Talentrax Global website and services.",
  },
  {
    href: "/accessibility",
    title: "Accessibility Statement",
    section: "Legal",
    description:
      "The Talentrax Global commitment to WCAG 2.1 AA and how to report an accessibility barrier.",
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
