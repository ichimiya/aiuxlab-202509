import type { Metadata } from "next";
import React from "react";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { WasmBackground } from "@/features/background/components/WasmBackground";
import { AppWindow } from "@/features/voiceRecognition/components/AppWindow";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: ["400"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} globalBackground antialiased flex min-h-screen items-center justify-center  text-justify`}
      >
        <Providers>
          <WasmBackground />
          <AppWindow>{children}</AppWindow>
        </Providers>
      </body>
    </html>
  );
}
