import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "International Center",
  description: "Multi-tenant caseworker time-tracking application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
