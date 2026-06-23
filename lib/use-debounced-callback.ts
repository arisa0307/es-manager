import { useEffect, useMemo, useRef } from "react";

/**
 * 入力のたびに即実行せず、最後の呼び出しから delay ミリ秒後にまとめて実行する。
 * 検索ボックスで1文字ごとに再取得・再ナビゲートするのを防ぐ。
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useMemo(
    () =>
      (...args: A) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
      },
    [delay]
  );
}
