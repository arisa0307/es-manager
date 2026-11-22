"use client";

import { createContext, useContext } from "react";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/lib/features";

const FeaturesContext = createContext<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

/** サーバーで読んだ本人の機能設定を、画面の部品へ配る */
export function FeaturesProvider({
  flags,
  children,
}: {
  flags: FeatureFlags;
  children: React.ReactNode;
}) {
  return <FeaturesContext.Provider value={flags}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): FeatureFlags {
  return useContext(FeaturesContext);
}
