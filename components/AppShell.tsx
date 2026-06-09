"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcon } from "./AppIcon";
import { SidebarNav } from "./SidebarNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span className="brand-copy">
            <strong>Meet<span>Note</span></strong>
            <small>Local meeting workspace</small>
          </span>
        </Link>
        <SidebarNav />
        <button
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          className="sidebar-collapse"
          onClick={() => setCollapsed((current) => !current)}
          type="button"
        >
          <AppIcon name="chevrons-left" size={18} />
        </button>
      </aside>
      <div className="app-content">
        <main className="page-shell">{children}</main>
      </div>
    </div>
  );
}
