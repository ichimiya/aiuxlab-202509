import type { Metadata } from "next";
import React from "react";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { Providers } from "./providers";
import { WasmBackground } from "@/features/background/components/WasmBackground";
import { AppWindow } from "@/shared/components/AppWindow";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NOVA",
  description:
    "NOVA provides Network Oriented Visualized Analysis, enabling users to explore complex data relationships through intuitive network graphs and uncover hidden insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} globalBackground antialiased flex min-h-screen items-center justify-center px-20`}
      >
        <Providers>
          <WasmBackground />
          <AppWindow innerClassName="space-y-8">
            <header className="flex flex-col items-center space-y-4 text-center">
              <Image
                src="/LogoNova.png"
                alt="NOVA logo"
                width={300}
                height={86}
                priority
              />
            </header>
            {children}
          </AppWindow>
        </Providers>
      </body>
    </html>
  );
}
