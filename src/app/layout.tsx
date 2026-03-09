import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "UFC Fantasy | Faça seus picks",
  description:
    "Faça seus picks, acerte os resultados e suba no ranking com seus amigos.",
  icons: { icon: "/favicon.ico" },
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
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              fontFamily: "'Encode Sans', sans-serif",
            },
            success: {
              iconTheme: { primary: "#EF4444", secondary: "white" },
            },
          }}
        />
      </body>
    </html>
  );
}
