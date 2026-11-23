"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { EnvBanner } from "@/components/EnvBanner";
import { FeaturesProvider } from "@/components/providers/FeaturesProvider";
import type { FeatureFlags } from "@/lib/features";

export function AppShell({
  children,
  features,
  canStorePassword,
}: {
  children: React.ReactNode;
  features: FeatureFlags;
  canStorePassword: boolean;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  return (
    <FeaturesProvider flags={features} canStorePassword={canStorePassword}>
      <EnvBanner />
      <Sidebar />
      <main className="md:pl-52 min-h-screen pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </FeaturesProvider>
  );
}
