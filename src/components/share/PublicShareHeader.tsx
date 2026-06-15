"use client";

import { useEffect, useState } from "react";
import { createAuthClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function PublicShareHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const { auth } = createAuthClient();
    auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  return (
    <header style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image src="/logo-dark.svg" alt="UFC Fantasy" width={113} height={20} className="h-5 w-auto" priority />
        </Link>
        <Link
          href={isLoggedIn ? "/home" : "/register"}
          className="px-4 py-2 font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--red)" }}
        >
          {isLoggedIn ? "Ir para o App" : "Jogar"}
        </Link>
      </div>
    </header>
  );
}
