"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <AuthCard
      title="ログイン"
      description="a.t 就活管理アプリ"
      footer={
        <p className="text-sm text-muted-foreground text-center">
          アカウントがない場合は{" "}
          <Link href="/signup" className="text-accent hover:underline">
            新規登録
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <ErrorMessage message={error} />}
        <Field label="メールアドレス">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="パスワード">
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "ログイン中..." : "ログイン"}
        </Button>
      </form>
    </AuthCard>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    startTransition(async () => {
      setError(null);
      setMessage(null);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }
      setMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
    });
  };

  return (
    <AuthCard
      title="新規登録"
      description="メールアドレスでアカウントを作成"
      footer={
        <p className="text-sm text-muted-foreground text-center">
          すでにアカウントがある場合は{" "}
          <Link href="/login" className="text-accent hover:underline">
            ログイン
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <ErrorMessage message={error} />}
        {message && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-md px-3 py-2">
            {message}
          </p>
        )}
        <Field label="メールアドレス">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="パスワード">
          <Input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "登録中..." : "アカウント作成"}
        </Button>
      </form>
    </AuthCard>
  );
}

function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
      {footer && <div className="mt-4">{footer}</div>}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-600 bg-red-500/10 rounded-md px-3 py-2">
      {message}
    </p>
  );
}
