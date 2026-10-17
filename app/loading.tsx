// ページ遷移中に即座に表示されるローディング。
// force-dynamic の各ページはサーバ描画に時間がかかるため、クリック直後に
// このスケルトンを出して「固まった」感をなくす(サイドバーは残ったまま)。
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="読み込み中">
      <div className="h-7 w-40 rounded-md bg-muted" />
      <div className="h-4 w-56 rounded bg-muted/70" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
