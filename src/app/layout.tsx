import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HorizonView — Project Intelligence Platform",
  description:
    "Microsoft-first, AI-enabled Project & Portfolio Management centered on Microsoft Fabric.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
