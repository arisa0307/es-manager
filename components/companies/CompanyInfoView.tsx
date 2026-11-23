"use client";

import { useState, useTransition } from "react";
import { revealLoginPassword } from "@/lib/actions/login-secret";
import { ExternalUrlLink, LinkifiedText } from "@/components/ui/LinkifiedText";
import type { Company } from "@/types";

/**
 * 企業情報の読み取り専用ビュー。
 * 値が入っている項目だけを表示し、空欄は出さない(常時開く巨大フォームをやめて見やすく)。
 * ヘッダーで既に出している項目(ステータス/結果/志望度/業界/締切/次のアクション)はここでは省く。
 */
export function CompanyInfoView({ company }: { company: Company }) {
  const groups: { title: string; rows: { label: string; node: React.ReactNode }[] }[] = [
    {
      title: "基本情報",
      rows: compact([
        company.salary && { label: "年収・待遇", node: company.salary },
      ]),
    },
    {
      title: "進行・インターン補足",
      rows: compact([
        company.internship_name && {
          label: "インターン名",
          node: company.internship_name,
        },
        company.internship_location && {
          label: "場所・URL",
          node: <LinkifiedText text={company.internship_location} />,
        },
        company.internship_memo && {
          label: "インターンメモ",
          node: <LinkifiedText text={company.internship_memo} />,
        },
        company.memo && {
          label: "企業メモ",
          node: <LinkifiedText text={company.memo} />,
        },
        company.interview_prep && {
          label: "面接対策メモ",
          node: <LinkifiedText text={company.interview_prep} />,
        },
      ]),
    },
    {
      title: "Webテスト",
      rows: compact([
        company.web_test_url && {
          label: "URL",
          node: <ExternalUrlLink url={company.web_test_url} />,
        },
        company.web_test_notes && {
          label: "メモ",
          node: <LinkifiedText text={company.web_test_notes} />,
        },
      ]),
    },
    {
      title: "ログイン情報",
      rows: compact([
        company.url && {
          label: "マイページ",
          node: <ExternalUrlLink url={company.url} />,
        },
        company.login_id && {
          label: "ID",
          node: <CopyValue value={company.login_id} mono />,
        },
        company.has_login_password && {
          label: "Password",
          node: <SecretValue companyId={company.id} />,
        },
      ]),
    },
  ].filter((g) => g.rows.length > 0);

  if (groups.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        まだ詳細情報がありません。「編集」から入力できます。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {group.title}
          </p>
          <dl className="divide-y divide-border/60 rounded-lg border border-border bg-muted/20">
            {group.rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[5.5rem_1fr] gap-3 px-3 py-2 text-sm"
              >
                <dt className="pt-0.5 text-xs text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="min-w-0 break-words text-foreground">{row.node}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function compact(
  rows: ({ label: string; node: React.ReactNode } | "" | false | null | undefined)[]
): { label: string; node: React.ReactNode }[] {
  return rows.filter(
    (r): r is { label: string; node: React.ReactNode } => Boolean(r)
  );
}

/**
 * 保存済みのパスワード。ページの HTML には含めず、「表示」か「コピー」を押したときだけ
 * サーバーで本人の行かを確かめてから受け取る。隠すと手元の値も捨てる。
 */
function SecretValue({ companyId }: { companyId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchValue = async (): Promise<string | null> => {
    const res = await revealLoginPassword(companyId);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    setError(null);
    return res.password;
  };

  const toggle = () => {
    if (value !== null) {
      setValue(null);
      return;
    }
    startTransition(async () => setValue(await fetchValue()));
  };

  const copy = () => {
    startTransition(async () => {
      const v = value ?? (await fetchValue());
      if (v === null) return;
      try {
        await navigator.clipboard.writeText(v);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        setError("コピーできませんでした");
      }
    });
  };

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-mono tracking-wider">{value ?? "••••••••"}</span>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="shrink-0 text-xs text-accent hover:underline disabled:opacity-60"
      >
        {value !== null ? "隠す" : "表示"}
      </button>
      <button
        type="button"
        onClick={copy}
        disabled={isPending}
        className="shrink-0 text-xs text-accent hover:underline disabled:opacity-60"
      >
        {copied ? "コピー済" : "コピー"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

function CopyValue({ value, mono }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* クリップボード不可の環境では何もしない */
    }
  };
  return (
    <span className="flex items-center gap-2">
      <span className={mono ? "font-mono" : ""}>{value}</span>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-xs text-accent hover:underline"
      >
        {copied ? "コピー済" : "コピー"}
      </button>
    </span>
  );
}
