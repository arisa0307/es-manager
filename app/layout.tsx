import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Noto_Sans_JP } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { getFeatureFlags } from "@/lib/features-server";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 日本語は Geist が未対応のため、Noto Sans JP を明示的に読み込んで
// 環境依存のフォールバックをなくす。
const notoSansJp = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "a.t — 就活管理",
  description: "企業・ES・タスクを一元管理する就活アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 利用者ごとの機能設定（未ログインなら既定値）
  const features = await getFeatureFlags();
  return (
    <html
      lang="ja"
      className={`${geist.variable} ${notoSansJp.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <AppShell features={features}>{children}</AppShell>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
