import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PWA & Algemene metadata
export const metadata: Metadata = {
  title: "STELR Writer",
  description: "De ultieme schrijf-app for manuscripten en wereldbeheer.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "STELR",
  },
};

// Mobiele viewport optimalisaties (voorkomt o.a. zoomen bij typen)
export const viewport: Viewport = {
  themeColor: "#334a56", // Matcht met je STELR_THEME.primary kleur
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}