import type { Metadata } from "next";
import "./globals.css";
import "./refinement.css";

export const metadata: Metadata = {
  title: "Miaki Planner — Group Trip Planner",
  description: "A cheerful place to plan any trip, split expenses, and settle up with friends.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
