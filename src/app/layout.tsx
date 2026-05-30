import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { defaultKeywords, siteConfig } from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "Cloudsurf Texture AI | AI Texture Atlas Generator",
    template: "%s | Cloudsurf Texture AI",
  },
  description: siteConfig.description,
  keywords: defaultKeywords,
  authors: [{ name: "Cloudsurf Software Development Services" }],
  creator: "Cloudsurf Software Development Services",
  publisher: "Cloudsurf Software Development Services",
  category: "design software",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cloudsurf Texture AI | AI Texture Atlas Generator",
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Cloudsurf Texture AI texture atlas workspace preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloudsurf Texture AI | AI Texture Atlas Generator",
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
