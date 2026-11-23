"use client";

import { createContext, useContext } from "react";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/lib/features";

const FeaturesContext = createContext<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
/** ログインパスワードを新しく保存できるか（暗号化の準備ができているか） */
const PasswordStorageContext = createContext<boolean>(false);

/** サーバーで読んだ本人の機能設定を、画面の部品へ配る */
export function FeaturesProvider({
  flags,
  canStorePassword = false,
  children,
}: {
  flags: FeatureFlags;
  canStorePassword?: boolean;
  children: React.ReactNode;
}) {
  return (
    <FeaturesContext.Provider value={flags}>
      <PasswordStorageContext.Provider value={canStorePassword}>
        {children}
      </PasswordStorageContext.Provider>
    </FeaturesContext.Provider>
  );
}

export function useCanStorePassword(): boolean {
  return useContext(PasswordStorageContext);
}

export function useFeatures(): FeatureFlags {
  return useContext(FeaturesContext);
}
