"use client";

import { useEffect, useState } from "react";
import { createAuthClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ShareCta() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const { auth } = createAuthClient();
    auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  return (
    <Link
      href={isLoggedIn ? "/home" : "/register"}
      className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest"
      style={{ border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {isLoggedIn ? "Ir para o App" : "Criar minha conta"}
    </Link>
  );
}
