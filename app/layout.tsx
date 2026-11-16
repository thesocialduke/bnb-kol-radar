import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { snapshot } from "@/lib/db";
import { longDate } from "@/lib/format";
import site from "@/config/site.json";

const sans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "BNB Chain KOL Radar", template: "%s · BNB Chain KOL Radar" },
  description: "Who drives BNB Chain conversation on X, scored on real 30-day data, with the emerging accounts worth approaching first.",
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { meta } = snapshot();
  const footer = (
    <p>
      Built by{" "}
      {site.url ? (
        <a href={site.url} target="_blank" rel="noreferrer" className="text-ink underline decoration-accent underline-offset-4">
          {site.author}
        </a>
      ) : (
        <span className="text-ink">{site.author}</span>
      )}{" "}
      for the {site.role} application. Independent project, not affiliated with BNB Chain. Data from LunarCrush and Google News.
    </p>
  );
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(/[?&]theme=light/.test(location.search)||localStorage.getItem("kol-radar-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}` }} />
      </head>
      <body>
        <Shell asOf={longDate(meta.as_of)} footer={footer}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
