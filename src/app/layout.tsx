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
  // Per-route metadata overrides this. The default is permissive; every
  // coming-soon route sets index:false via buildMetadata({ noIndex: true }).
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={site.locale} className={`${geistSans.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
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
