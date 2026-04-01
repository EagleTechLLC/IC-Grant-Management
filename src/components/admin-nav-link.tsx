"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminNavLinkProps {
  href: string;
  label: string;
  badge?: number;
}

export default function AdminNavLink({ href, label, badge }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className={cn(
          "ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none",
          isActive ? "bg-white/20 text-white" : "bg-red-500 text-white"
        )}>
          {badge}
        </span>
      )}
    </Link>
  );
}
