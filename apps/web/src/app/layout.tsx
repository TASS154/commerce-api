import type { ReactNode } from "react";
import { Providers } from "@/lib/store";
import { Shell } from "@/components/Shell";
import "./globals.css";

export const metadata = {
  title: "Vespera — Commerce Demo",
  description:
    "Premium commerce demo with a horizontally scalable API, secure checkout, and recruiter-friendly architecture docs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
