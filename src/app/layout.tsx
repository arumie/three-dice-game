import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeToggle } from "@/components/theme-toggle";
import { GameRulesDialog } from "@/components/game-rules-dialog";
import { MobileToolbar } from "@/components/mobile-toolbar";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Three Dice Game",
  description: "A web application to play the Three Dice Game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-svh flex-col antialiased`}
      >
        <div className="aurora-bg" />
        <ViewTransition>{children}</ViewTransition>
        <SiteFooter />
        <GameRulesDialog />
        <MobileToolbar />
        <ThemeToggle />
        <Toaster />
      </body>
    </html>
  );
}
