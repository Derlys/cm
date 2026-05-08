"use client";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-row items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="mr-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition hover:bg-white/5">
            <img src="/connectamind-logo.png" alt="Connectamind" className="size-8 rounded-md" />
            <span className="hidden font-black sm:inline">Connectamind</span>
          </Link>
          <Link href="/" className="px-3 py-2 text-foreground transition hover:text-[#ff9f1c]">
            Feed
          </Link>
          {session ? (
            <Link href="/library" className="px-3 py-2 text-muted-foreground transition hover:text-foreground">
              Library
            </Link>
          ) : null}
          {session ? (
            <Link href="/creator" className="px-3 py-2 text-muted-foreground transition hover:text-foreground">
              Create
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
