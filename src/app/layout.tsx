import type { Metadata, Viewport } from "next";
import { Saira_Condensed } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import "./globals.css";

const sairaCondensed = Saira_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-saira-condensed",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "UFC Fantasy | Faça seus picks",
  description:
    "Faça seus picks, acerte os resultados e suba no ranking com seus amigos.",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "UFC Fantasy | Faça seus picks",
    description:
      "Faça seus picks, acerte os resultados e suba no ranking com seus amigos.",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "UFC Fantasy",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "UFC Fantasy",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UFC Fantasy | Faça seus picks",
    description:
      "Faça seus picks, acerte os resultados e suba no ranking com seus amigos.",
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={sairaCondensed.variable}>
      <body className="font-sans">
        <ThemeProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              fontFamily: "'Saira Condensed', sans-serif",
            },
            success: {
              iconTheme: { primary: "var(--red)", secondary: "white" },
            },
          }}
        />
      </body>
    </html>
  );
}
