import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Order Book Microstructure Lab — Short-Horizon Price Predictability Research",
  description:
    "A research-grade study of short-horizon price predictability, cross-session generalization, market regimes, latency, and execution costs using limit-order-book data.",
  keywords: [
    "market microstructure",
    "limit order book",
    "quantitative research",
    "order flow imbalance",
    "microprice",
    "HFT research",
    "short-horizon predictability",
    "out-of-sample validation",
  ],
  authors: [{ name: "Order Book Microstructure Lab" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Order Book Microstructure Lab",
    description:
      "Research-grade study of short-horizon price predictability, cross-session generalization, and execution costs using limit-order-book data.",
    siteName: "Order Book Microstructure Lab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Order Book Microstructure Lab",
    description:
      "Research-grade study of short-horizon price predictability, cross-session generalization, and execution costs using limit-order-book data.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
