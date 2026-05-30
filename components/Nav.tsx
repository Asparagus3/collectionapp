"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/search", label: "検索" },
  { href: "/users", label: "ユーザー" },
  { href: "/import", label: "写真" },
  { href: "/my", label: "マイコレクション" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-4 flex gap-1 h-12 items-center overflow-x-auto scrollbar-none">
        <span className="font-semibold text-sm mr-4 text-zinc-900 dark:text-zinc-100">
          My Collection
        </span>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname === href
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
