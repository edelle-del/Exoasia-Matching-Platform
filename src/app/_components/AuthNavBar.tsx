import Link from "next/link";
import Image from "next/image";
import logo from "@/app/logo.png";

export default function AuthNavBar() {
  return (
    <nav className="shrink-0 flex items-center justify-between border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-6 sm:px-10 h-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <Image src={logo} alt="Founders Arena" width={22} height={22} className="rounded" />
        <span className="hidden sm:block text-[11px] font-black tracking-widest text-[var(--color-ink)] uppercase">
          Founders Arena
        </span>
      </Link>

      {/* Help Center link */}
      <Link
        href="/docs"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
      >
        <i className="ri-book-open-line text-base leading-none" aria-hidden="true" />
        <span>Help Center</span>
      </Link>
    </nav>
  );
}
