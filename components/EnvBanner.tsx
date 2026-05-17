export function EnvBanner() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      Supabase未設定 — .env.local に URL / ANON_KEY を設定し、
      <code className="mx-1 text-xs bg-amber-500/10 px-1 rounded">supabase/schema.sql</code>
      を実行してください
    </div>
  );
}
