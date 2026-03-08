import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "UFC Fantasy | Faça seus picks",
  description: "Plataforma de fantasy para eventos do UFC com amigos",
  icons: { icon: "/favicon.ico" },
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
