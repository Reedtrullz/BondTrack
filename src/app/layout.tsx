import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { AlertRuntime } from "@/components/alerts/alert-runtime";
import { AlertProvider } from "@/lib/hooks/use-alerts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://bond.thorchain.no'),
  title: {
    default: "Heimdall | THORChain Investment Command Center",
    template: "%s | Heimdall",
  },
  description: "The all-seeing guardian of your THORChain node infrastructure.",
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-full antialiased"
        suppressHydrationWarning
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AlertProvider>
            <AlertRuntime />
            {children}
          </AlertProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
