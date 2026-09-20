import {CANONICAL_ORIGIN} from '@/lib/origin';
import type { Metadata } from "next";
import "./globals.css";
import {SiteHeader,SiteFooter} from "@/components/site-brand";
import {BRAND,DESCRIPTION,social,twitter,X_URL} from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: BRAND,
  description: DESCRIPTION,
  openGraph:social,
  twitter,
  icons: {
    icon: "/brand/relay-icon-96.94e637828dd6.png",
    shortcut: "/brand/relay-icon-96.94e637828dd6.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="alternate" type="application/rss+xml" title="Open-Task-Relay — Accepted Work" href="/accepted.xml"/></head>
      <body className="antialiased"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"WebSite",name:BRAND,url:CANONICAL_ORIGIN,description:DESCRIPTION,inLanguage:"en",sameAs:[X_URL]}).replace(/</g,'\\u003c')}}/><a className="skip-link" href="#site-content">Skip to content</a><SiteHeader/><div id="site-content">{children}</div><SiteFooter/></body>
    </html>
  );
}
