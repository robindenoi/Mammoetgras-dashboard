"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-mg-dark text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <svg
            viewBox="0 0 32 32"
            className="h-8 w-8 text-mg-accent"
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
          <div>
            <span className="text-lg font-bold tracking-tight">
              Mammoetgras
            </span>
            <span className="ml-2 hidden text-sm font-medium text-white/60 sm:inline">
              Bezwaarkaarten
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-white/70 sm:inline">
                {user.email}
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
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
