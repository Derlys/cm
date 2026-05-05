"use client";
import Link from "next/link";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Feed" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-row items-center justify-between px-4 py-3">
        <nav className="flex gap-4 text-sm font-medium">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to} className="text-muted-foreground transition hover:text-foreground">
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
