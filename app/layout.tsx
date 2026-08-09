import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SwRegister } from "@/components/providers/sw-register";

export const metadata: Metadata = {
  title: {
    default: "Student Academic Dashboard",
    template: "%s | Student Academic Dashboard",
  },
  description:
    "Manage your complete academic life — attendance, GPA, fees, routine, assignments, and more. Offline-first, private, and free.",
  manifest: "/manifest.json",
  keywords: [
    "student dashboard",
    "academic tracker",
    "attendance tracker",
    "GPA calculator",
    "CGPA calculator",
    "university",
    "offline",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <DatabaseProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </DatabaseProvider>
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              duration: 3000,
            }}
          />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
