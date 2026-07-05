import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "wigolo — the go-to web for your local agent",
  description:
    "Local-first web intelligence over MCP. Search, fetch, crawl, extract, cache, and research for any AI coding agent — no API keys, no cloud, no metered bill.",
  icons: { icon: "/wigolo/wigolo-icon.png" },
  openGraph: {
    title: "wigolo — the go-to web for your local agent",
    description:
      "Local-first web intelligence over MCP. No keys, no cloud, no metered bill.",
    type: "website",
    images: ["/wigolo/wigolo-social.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "wigolo — the go-to web for your local agent",
    description:
      "Local-first web intelligence over MCP. No keys, no cloud, no metered bill.",
    images: ["/wigolo/wigolo-social.png"],
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
