import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skins Tracker",
  description: "Track a golf skins game and closest-to-the-pin, then settle up.",
  applicationName: "Skins Tracker",
  appleWebApp: { capable: true, title: "Skins", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d5c36" },
    { media: "(prefers-color-scheme: dark)", color: "#070a08" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
