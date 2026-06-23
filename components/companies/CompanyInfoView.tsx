"use client";

import { useState } from "react";
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
        company.url && {
          label: "URL",
          node: <ExternalUrlLink url={company.url} />,
        },
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
        company.login_id && {
          label: "ID",
          node: <CopyValue value={company.login_id} mono />,
        },
        company.login_password && {
          label: "Password",
          node: <SecretValue value={company.login_password} />,
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

function SecretValue({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
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
      <span className="font-mono tracking-wider">{shown ? value : "••••••••"}</span>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="shrink-0 text-xs text-accent hover:underline"
      >
        {shown ? "隠す" : "表示"}
      </button>
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
