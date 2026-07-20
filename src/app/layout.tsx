import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Mammoetgras — Bezwaarkaarten",
  description:
    "Sales objection-handling dashboard voor Mammoetgras Wereldwijd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-mg-light font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
