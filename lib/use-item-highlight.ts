"use client";

import { useEffect } from "react";

const HIGHLIGHT_CLASSES = ["ring-2", "ring-accent", "ring-offset-2", "ring-offset-background"];

/**
 * URL の item=... で指定された要素までスクロールし、数秒だけ枠で目立たせる。
 * 欄を開いた直後は要素がまだ無いことがあるので、少しのあいだ探し直す。
 */
export function useItemHighlight(itemId: string | null | undefined, deps: unknown[] = []) {
  useEffect(() => {
    if (!itemId) return;
    let tries = 0;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const find = () => {
      const el = document.getElementById(itemId);
      if (!el) {
        if (tries++ < 20) retryTimer = setTimeout(find, 50);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(...HIGHLIGHT_CLASSES);
      removeTimer = setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), 2500);
    };
    let retryTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(find, 0);
    return () => {
      clearTimeout(retryTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, ...deps]);
}

/**
 * 画面の開閉状態を URL のクエリに残す（戻るボタンで同じ状態に戻すため）。
 * サーバーへの再取得は起こさず、履歴の今の項目だけを書き換える。
 */
export function replaceQuery(update: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(update)) {
    if (v === null || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  window.history.replaceState(window.history.state, "", url.toString());
}
