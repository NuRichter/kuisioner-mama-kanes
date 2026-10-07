import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { meta, respondentInfo } from "@/data/questionnaire";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `Kuesioner Penelitian: ${meta.title}`,
  description: respondentInfo.purpose,
  applicationName: "Kuesioner Penelitian",
  authors: [{ name: meta.author }],
  openGraph: {
    title: "Kuesioner Penelitian",
    description: meta.title,
    locale: "id_ID",
    type: "website",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#101312" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geist.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[10px] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Langsung ke isi kuesioner
        </a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
