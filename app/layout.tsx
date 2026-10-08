import type { Metadata } from "next";
import localFont from "next/font/local";
import GoogleAnalytics from "@/app/GoogleAnalytics";
import Script from "next/script";

import "./globals.css";
import { MenuProvider } from "@/components/menuContext";
import { PageTransition } from "@/components/pageTransition";

const helvetica = localFont({
  src: "../font/helvetica/HelveticaNowDisplay-Medium.woff2",
  style: "normal",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Vipul Kumar • Developer",
  description:
    "Vipul Kumar is a developer who creates beautiful and pixel perfect websites with zero effort in reviews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"
        ></meta>
        <GoogleAnalytics />
      </head>

      <body className={helvetica.className}>
        <MenuProvider>
          <PageTransition>{children}</PageTransition>
        </MenuProvider>
      </body>
      <Script src="https://cdn.jsdelivr.net/gh/vipulkumar-dev/gsap@2024/ScrambleTextPlugin.min.js" />
    </html>
  );
}
