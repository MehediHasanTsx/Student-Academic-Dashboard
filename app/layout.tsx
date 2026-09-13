import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
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
    default: "DCC CSE",
    template: "%s | DCC CSE",
  },
  description:
    "DCC CSE is a student utility application designed for Dhaka City College CSE students. Track attendance, GPA, fees, routine, and more — offline-first and privacy-focused.",
  manifest: "/manifest.json",
  keywords: [
    "DCC CSE",
    "Dhaka City College",
    "CSE",
    "student dashboard",
    "attendance tracker",
    "GPA calculator",
    "CGPA calculator",
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
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <DatabaseProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </DatabaseProvider>
          </AuthProvider>
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
