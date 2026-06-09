"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "./AppIcon";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      <Link className={pathname === "/settings" ? "" : "active"} href="/meetings">
        <AppIcon name="list" />
        <span>会議一覧</span>
      </Link>
      <Link className={pathname === "/settings" ? "active" : ""} href="/settings">
        <AppIcon name="settings" />
        <span>設定</span>
      </Link>
    </nav>
  );
}
