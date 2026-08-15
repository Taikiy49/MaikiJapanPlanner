import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maiki — Japan Travel Planner",
  description: "A cheerful, organized home for your Japan adventure.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
