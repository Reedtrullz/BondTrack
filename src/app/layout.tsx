import type { Metadata } from "next";
import { Exo2, Open_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

console.log('HEIMDALL LAYOUT LOADED - FIX APPLIED'); // Marker to verify deployment

const exo2 = Exo2({
  variable: "--font-exo2",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heimdall | THORChain Watcher",
  description: "The all-seeing guardian of your THORChain node infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${openSans.variable} ${exo2.variable} min-h-full antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
