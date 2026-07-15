import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACE — Autonomous Chief Executor",
  description: "Your Autonomous Chief Executor for automating operational workflows.",
  openGraph: {
    title: "ACE — Autonomous Chief Executor",
    description: "Your Autonomous Chief Executor for automating operational workflows.",
    url: "https://ace.ai",
    siteName: "ACE",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ACE — Autonomous Chief Executor",
    description: "Your Autonomous Chief Executor for automating operational workflows.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
