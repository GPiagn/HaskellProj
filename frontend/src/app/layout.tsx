import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/toast";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Biblioteca UNIFESP — Inventário do Acervo",
    template: "%s · Biblioteca UNIFESP",
  },
  description:
    "Sistema de gestão de inventário do acervo bibliográfico da Universidade Federal de São Paulo",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
  applicationName: "Biblioteca UNIFESP",
  authors: [{ name: "UNIFESP" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolage.variable} ${figtree.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
