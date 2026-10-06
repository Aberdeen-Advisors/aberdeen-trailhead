import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HorizonView — Project Intelligence Platform",
  description:
    "AI-enabled project and portfolio management that works on your existing stack: Microsoft 365, Power BI and Fabric, or its own built-in project database.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
