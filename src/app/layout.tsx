import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { site } from "@/content/site";
import { metadataBase } from "@/lib/metadata";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    // Routes set only their own title; the site name is appended here.
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  // No `robots` default here. Every route sets its own via buildMetadata(), so
  // a default would only ever apply to not-found.tsx - where Next already
  // injects its own noindex for the 404 status. Setting one produced a second,
  // contradictory `index, follow` tag on that page.
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
      NO HEIGHT CONSTRAINT ON <html>. It used to carry `h-full`
      (height: 100%) so that `min-h-full` on the body had a percentage to
      resolve against. That makes the root element exactly viewport-height
      with its content overflowing it, and the App Router resets scroll by
      assigning `document.documentElement.scrollTop = 0` - see
      next/dist/client/components/layout-router.js. Sizing the body against
      the viewport directly removes the question entirely.

      `svh` rather than `dvh`: the small viewport height does not change as
      mobile browser chrome hides and shows, so the footer does not shift
      while someone is scrolling.

      data-scroll-behavior="smooth" is REQUIRED, not decorative. Next only
      neutralises smooth scrolling during a route transition when that
      attribute is present (see
      next/dist/shared/lib/router/utils/disable-smooth-scroll.js); without
      it, the smooth rule in globals.css would make route changes animate
      their jump to the top. It also silences a dev-only warning about the
      same thing.
    */
    <html
      lang={site.locale}
      className={geistSans.variable}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-svh flex-col antialiased">
        <SkipLink />
        <Header />
        {/*
          The single <main> landmark for every route. tabIndex={-1} makes it a
          valid target for the skip link so focus actually lands here rather
          than only scrolling the viewport.
        */}
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
