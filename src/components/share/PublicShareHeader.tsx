import Image from "next/image";
import Link from "next/link";

export default function PublicShareHeader() {
  return (
    <header style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image src="/logo-dark.svg" alt="UFC Fantasy" width={113} height={20} className="h-5 w-auto" priority />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="font-condensed text-xs font-700 uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--red)" }}
          >
            Jogar
          </Link>
        </div>
      </div>
    </header>
  );
}
