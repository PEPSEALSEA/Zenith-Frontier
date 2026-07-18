import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Oxanium } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '@/lib/googleClientId';

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zenith Frontier | Web RPG",
  description: "Scene2D web RPG — Browser → Cloudflare Worker → Pi SQLite. Forge maps, fight, collect Arcanum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${oxanium.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
