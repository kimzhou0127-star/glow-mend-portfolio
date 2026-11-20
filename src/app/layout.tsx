import type { Metadata } from "next";
import { SiteShell } from "@/components/portfolio/SiteShell";
import data from "@/data/portfolio.json";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: `${data.profile.name} — Glow Mend`,
    template: `%s | ${data.profile.name}`,
  },
  description: data.profile.hero.replaceAll("\n", " "),
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
