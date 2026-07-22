"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import RoleNav from "@/components/RoleNav";

export default function Header() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="bg-mg-dark text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <svg
              viewBox="0 0 32 32"
              className="h-7 w-7 text-mg-accent"
              fill="currentColor"
            >
              <path d="M16 2c1 4 3 8 3 14s-1 10-3 14c-2-4-3-8-3-14S15 6 16 2z" />
              <path
                d="M8 8c3 3 5 7 6 13M24 8c-3 3-5 7-6 13"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span className="text-base font-bold tracking-tight">
              Mammoetgras
            </span>
          </Link>
          <RoleNav />
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-white/70 sm:inline">
                {profile?.full_name || user.email}
              </span>
              <button
                onClick={signOut}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
              >
                Uitloggen
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
            >
              Inloggen
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
