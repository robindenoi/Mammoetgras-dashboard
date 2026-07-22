import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Mammoetgras",
  description: "Sales-dashboard voor Mammoetgras Wereldwijd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-mg-light font-sans text-gray-900 antialiased">
        <AuthProvider>
          <Header />
          <div className="flex flex-1 flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
