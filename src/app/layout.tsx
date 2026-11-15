import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "../styles/globals.css";
import { Toaster } from "@/components/ui/Toaster";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aariy · Seller Portal",
  description: "Aariy seller portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <div className="main-shell">
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  );
}
