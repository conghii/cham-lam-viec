import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { TopLoaderProvider } from "@/components/providers/top-loader-provider";
import { LanguageProvider } from "@/components/shared/language-context";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#064e3b",
};

export const metadata: Metadata = {
  title: "ChamLam. | Personal Productivity System",
  description: "A minimalist, goal-oriented system to help you win every day.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ChamLam",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <TopLoaderProvider />
            {children}
            <Toaster position="top-center" richColors />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
