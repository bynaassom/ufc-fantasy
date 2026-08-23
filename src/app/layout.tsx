import type { Metadata, Viewport } from "next";
import { Saira_Condensed } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import MotionProvider from "@/components/ui/MotionProvider";
import PwaManager from "@/components/layout/PwaManager";
import "./globals.css";

const sairaCondensed = Saira_Condensed({
  weight: ["400", "500", "600", "700", "800", "900"],
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
  title: "UFC Fantasy | Jogue ou acompanhe cada luta",
  description:
    "Faça seus picks ou acompanhe o card sem cadastro, com alertas personalizados e resultados opcionais sem spoilers.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png?v=3",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "UFC Fantasy | Jogue ou acompanhe cada luta",
    description:
      "Fantasy, rankings, ligas e um modo Companion sem cadastro, com alertas por evento ou luta.",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "UFC Fantasy",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UFC Fantasy | Jogue ou acompanhe cada luta",
    description:
      "Fantasy, rankings, ligas e um modo Companion sem cadastro, com alertas por evento ou luta.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={sairaCondensed.variable}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ufc-fantasy-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body className="font-sans">
        <PwaManager />
        <a href="#app-content" className="skip-link">
          Pular para o conteúdo
        </a>
        <ThemeProvider>
          <MotionProvider>
            <ErrorBoundary>
              <div id="app-content" tabIndex={-1}>
                {children}
              </div>
            </ErrorBoundary>
          </MotionProvider>
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
