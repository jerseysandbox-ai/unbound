import type { Metadata } from "next";
import { version } from "../package.json";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/** Display font for hero headlines — gives warmth and editorial weight */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Unbound: Personalized Homeschool Plans for Neurodivergent Kids",
  description:
    "AI-powered daily lesson plans tailored to your child's unique learning style. Personalized homeschool curriculum, built for your family.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 — Unbound property (G-SEGN8M15H2) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SEGN8M15H2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SEGN8M15H2');
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        {children}
        {/* Version badge — bottom-right corner, unobtrusive */}
        <div className="fixed bottom-2 right-2 text-[10px] text-gray-400 opacity-50 select-none pointer-events-none z-50">
          v{version}{process.env.NEXT_PUBLIC_ENV ? ` (${process.env.NEXT_PUBLIC_ENV})` : ""}
        </div>
      </body>
    </html>
  );
}
