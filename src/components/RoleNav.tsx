"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/", label: "Bezwaarkaarten", roles: ["agent", "closer", "admin"] },
  { href: "/leads", label: "Sales Agents Board", roles: ["agent", "closer", "admin"] },
  { href: "/closing", label: "Closing Board", roles: ["agent", "closer", "admin"] },
  { href: "/deals", label: "Deals", roles: ["agent", "closer", "admin"] },
  { href: "/import", label: "Import", roles: ["admin"] },
  { href: "/beheer", label: "Beheer", roles: ["admin"] },
];

export default function RoleNav() {
  const { role } = useAuth();
  const pathname = usePathname();
  if (!role) return null;

  const items = NAV.filter((i) => i.roles.includes(role));

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
