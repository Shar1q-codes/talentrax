/**
 * /accessibility content.
 *
 * WE DO NOT CLAIM CONFORMANCE, and nothing in this file may start to.
 *
 * Not one page of this site has been operated in a browser by the people who
 * built it: no keyboard run-through, no screen reader, no zoom or reflow
 * testing, no independent audit. The measures listed below are real - they
 * are implemented in code and checked by review and by automated assertions
 * against the served HTML - but implementing a measure is not the same as
 * verifying it works for the person it is for.
 *
 * A conformance claim in that situation is false, and in the US a false
 * accessibility claim is the kind of thing that attracts a demand letter. So
 * this page says what the site is built to aim at, what is actually in place,
 * what has not been tested, and how to report a barrier. The sentence
 * admitting no audit has happened is worth more than a badge.
 *
 * NO DATE, NO VERSION, NO "LAST REVIEWED" LINE until something real has been
 * reviewed. A review date is a claim too.
 */

import type { SectionIntro } from "./types";

export const accessibilityMeta = {
  title: "Accessibility",
  description:
    "The accessibility standard Talentrax Global builds this site to aim at, the measures in place, what has not yet been tested, and how to report a barrier.",
};

export const accessibilityHero = {
  eyebrow: "Legal",
  heading: "Accessibility",
  intro:
    "What this site is built to aim at, what is actually in place, and what has not been tested yet.",
};

/**
 * The standard, stated as a target rather than an achievement. Read the
 * second paragraph before editing the first.
 */
export const standard: SectionIntro & { body: string[] } = {
  eyebrow: "The standard",
  heading: "What we build to",
  intro:
    "This site is built to aim at the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.",
  body: [
    "That is the target the work is measured against, not a claim about the result. This site has not been independently audited, and it has not been tested with a screen reader, with speech input, or by anyone who relies on assistive technology to use the web. Until it has, we are not in a position to tell you it meets the standard, and we are not going to say it does.",
    "What we can tell you is exactly what has been built in, and exactly what has not been checked. Both are below.",
  ],
};

export type Measure = {
  id: string;
  title: string;
  detail: string;
};

export const measures: SectionIntro & { items: Measure[] } = {
  eyebrow: "In place",
  heading: "What has been built in",
  intro:
    "Each of these is implemented across every page and enforced in the codebase rather than left to habit.",
  items: [
    {
      id: "headings",
      title: "One page title, in order",
      detail:
        "Every page has exactly one h1 and no skipped heading levels, so the heading outline can be used to navigate the page rather than just to size text.",
    },
    {
      id: "landmarks",
      title: "Named landmarks and a skip link",
      detail:
        "A skip-to-content link is the first thing you reach with a keyboard, the main region can actually take focus, and each navigation region carries its own name so a landmark list is useful rather than a row of identical entries.",
    },
    {
      id: "keyboard",
      title: "Keyboard operation throughout",
      detail:
        "Every control is a native button, link, input, select or textarea. Dropdown menus and the mobile drawer support arrow keys and Escape, return focus to the control that opened them, and the drawer is removed from the tab order while it is closed.",
    },
    {
      id: "focus",
      title: "A focus indicator that is never removed",
      detail:
        "One global rule draws the focus outline, so no component can ship without one, and it switches to white against dark bands where the default would lose contrast.",
    },
    {
      id: "forms",
      title: "Labelled forms with errors you can find",
      detail:
        "Every field on every form has a real label, related fields are grouped under a legend, and required fields are marked with an asterisk explained above the form as well as by the field itself. When a form is submitted with a problem, a summary appears at the top, takes focus, and links to each field; each field also carries its own message.",
    },
    {
      id: "contrast",
      title: "Contrast targets, including on controls",
      detail:
        "Text and background pairs are chosen against a measured contrast ratio recorded beside each colour in the code. The boundary of a form control or an outlined button uses a stronger colour than the decorative rules, because the edge is what tells you the control is there.",
    },
    {
      id: "colour",
      title: "Never colour on its own",
      detail:
        "An error is colour plus an icon plus text plus a programmatic state. A required field is a glyph and an attribute, not a red label.",
    },
    {
      id: "motion",
      title: "Reduced motion honoured",
      detail:
        "If your system asks for reduced motion, transitions and animations are cut to nothing site-wide.",
    },
    {
      id: "responsive",
      title: "Usable at small sizes",
      detail:
        "The layout is built mobile first and is intended to work down to a 320px viewport without sideways scrolling. Interactive targets are at least 44px.",
    },
    {
      id: "no-third-party",
      title: "Nothing third-party in the way",
      detail:
        "No cookie banner, no chat widget, no overlay, no advertising. Accessibility overlays in particular are not used here: they do not fix underlying problems and they interfere with the assistive technology people already have set up.",
    },
  ],
};

export const notTested: SectionIntro & { items: string[]; closing: string } = {
  eyebrow: "Not yet verified",
  heading: "What has not been tested",
  intro:
    "Being straight about this is more useful to you than a badge would be.",
  items: [
    "No independent accessibility audit has been carried out.",
    "The site has not been tested with a screen reader, with voice control, or with a switch device.",
    "It has not been tested at high zoom or with text spacing overrides applied.",
    "It has not been tested by people with disabilities, which is the only test that really answers the question.",
  ],
  closing:
    "The measures in the previous section are implemented and checked by review and by automated checks of the delivered HTML. That catches a missing label or a broken heading order. It does not tell you whether the page is usable with a screen reader, and we are not going to imply that it does.",
};

export const reportBarrier: SectionIntro & {
  body: string[];
  cta: { label: string; href: string };
} = {
  eyebrow: "Reporting a problem",
  heading: "If something here does not work for you",
  intro:
    "Tell us, and be as specific as you can bear to be: the page, what you were trying to do, and what happened instead. What you were using - browser, assistive technology, phone or desktop - helps more than anything else.",
  body: [
    // The dedicated accessibility address is CLIENT-CONFIRM.md item 11. Until
    // it exists, the contact form is the honest route rather than an invented
    // inbox that bounces (rule 5).
    "Use the contact form and say it is an accessibility problem. It reaches a person, not a queue.",
    "If a barrier stops you finishing something on this site - sending a resume, or getting a role to us - tell us what you were trying to do and we will do it with you another way rather than leaving you to fight the page.",
  ],
  cta: { label: "Contact us", href: "/contact" },
};
