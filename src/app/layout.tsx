import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@/app/GoogleAnalytics";

import "./globals.css";
import { PageTransition } from "@/common";
import { MenuProvider } from "@/shared";

const helvetica = localFont({
  src: "../../font/helvetica/HelveticaNowDisplay-Medium.woff2",
  style: "normal",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Renzo Dev • Developer",
  description: "Renzo is a developer who creates high-end, pixel-perfect websites.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"></meta>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
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
