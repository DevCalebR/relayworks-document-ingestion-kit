import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocForge AI",
  description: "Convert PDFs into clean AI-ready Markdown",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
