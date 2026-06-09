import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetNote",
  description: "ローカルファーストの会議議事録アプリ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-mark">M</span>
            <span>
              <strong>MeetNote</strong>
              <small>Local meeting workspace</small>
            </span>
          </Link>
          <nav>
            <Link href="/">会議一覧</Link>
            <Link href="/settings">設定</Link>
          </nav>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
