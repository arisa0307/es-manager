"use client";

import { useState } from "react";

const GMAIL_MCP = "https://gmailmcp.googleapis.com/mcp/v1";

async function callClaude({ system, user }: { system: string; user: string }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system,
      mcp_servers: [{ type: "url", url: GMAIL_MCP, name: "gmail" }],
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return data.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
}

function extractJSON(text: string) {
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("レスポンスのパースに失敗しました");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        flexShrink: 0,
        marginTop: 2,
        background: checked ? "#5B8EF0" : "transparent",
        border: `2px solid ${checked ? "#5B8EF0" : "#2E3650"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.12s",
      }}
    >
      {checked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
    </div>
  );
}

type TriageEmail = {
  threadId: string;
  subject: string;
  from: string;
  date: string;
  category: "要対応" | "既読でOK";
  reason: string;
};

function EmailCard({
  email,
  selected,
  onToggle,
}: {
  email: TriageEmail;
  selected: boolean;
  onToggle: (threadId: string) => void;
}) {
  const isOk = email.category === "既読でOK";
  return (
    <div
      onClick={() => isOk && onToggle(email.threadId)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        background: selected ? "#141B2E" : "#111520",
        border: `1px solid ${selected ? "#2E3E6A" : "#191E30"}`,
        borderLeft: `3px solid ${isOk ? (selected ? "#5B8EF0" : "#2E3650") : "#D06858"}`,
        borderRadius: 7,
        cursor: isOk ? "pointer" : "default",
        transition: "all 0.12s",
        userSelect: "none",
      }}
    >
      {isOk ? (
        <Checkbox checked={selected} />
      ) : (
        <div
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#D06858", fontSize: 13, fontWeight: 700 }}>!</span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: isOk ? 400 : 500,
            color: isOk ? "#6B7490" : "#CDD2E8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {email.subject}
        </div>
        <div style={{ fontSize: 11, color: "#3D4460", marginTop: 3 }}>
          {email.from}　{email.date}
        </div>
        <div
          style={{
            fontSize: 11,
            color: isOk ? "#3D4460" : "#8A7E70",
            marginTop: 4,
            fontStyle: "italic",
          }}
        >
          {email.reason}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10,
          color: accent,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        <span>{label}</span>
        <span
          style={{
            background: "#13172A",
            border: `1px solid #1E2338`,
            padding: "1px 8px",
            borderRadius: 10,
            color: "#4A5270",
          }}
        >
          {count}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

export default function InboxTriagePage() {
  const [phase, setPhase] = useState("idle");
  const [emails, setEmails] = useState<TriageEmail[]>([]);
  const [selected, setSelected] = useState(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  const [markedCount, setMarkedCount] = useState(0);

  const important = emails.filter((e) => e.category === "要対応");
  const ok = emails.filter((e) => e.category === "既読でOK");
  const selectedCount = ok.filter((e) => selected.has(e.threadId)).length;

  const fetchAndClassify = async () => {
    setPhase("loading");
    setError(null);
    try {
      const text = await callClaude({
        system:
          "就活メール仕分けアシスタント。Gmail MCPで未読メールを検索し、指定のJSON形式のみで返答。余計なテキスト・マークダウン不要。",
        user: `Gmail MCPで "is:unread newer_than:14d" を検索し就活メールを分類。
以下のJSON形式のみで返答（コードブロック不要）：
{"emails":[{"threadId":"xxx","subject":"件名","from":"送信者名","date":"日付","category":"要対応","reason":"20文字以内の理由"}]}

・要対応 = ESや適性検査締切、インターン・説明会案内（未登録）、選考結果、企業からの個別連絡
・既読でOK = 非ターゲット業界（商社・不動産・金融・保険）、一般的なメルマガ、確認済みと思われるもの`,
      });
      const data = extractJSON(text);
      const list: TriageEmail[] = data.emails || [];
      setEmails(list);
      setSelected(new Set(list.filter((e) => e.category === "既読でOK").map((e) => e.threadId)));
      setPhase("classified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setPhase("idle");
    }
  };

  const markAsRead = async () => {
    if (selectedCount === 0) return;
    setPhase("marking");
    try {
      const ids = Array.from(selected).filter((id) => ok.some((e) => e.threadId === id));
      await callClaude({
        system: "Gmail MCPのunlabel_threadでUNREADラベルを削除。完了したら done とだけ返す。",
        user: `以下のスレッドIDのUNREADラベルを削除: ${ids.join(",")}`,
      });
      setMarkedCount(ids.length);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setPhase("classified");
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCount === ok.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ok.map((e) => e.threadId)));
    }
  };

  const reset = () => {
    setPhase("idle");
    setEmails([]);
    setSelected(new Set());
    setError(null);
  };

  const s = {
    root: {
      minHeight: "100vh",
      background: "#0A0C14",
      color: "#CDD2E8",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "28px 20px",
      maxWidth: 500,
      margin: "0 auto",
    },
    eyebrow: {
      fontSize: 10,
      color: "#3D4460",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      marginBottom: 4,
    },
    title: { fontSize: 22, fontWeight: 600, color: "#E0E6F8", marginBottom: 32 },
    center: { textAlign: "center" as const, padding: "56px 0" },
    muted: { fontSize: 13, color: "#3D4460" },
    btn: (active: boolean) => ({
      background: active ? "#5B8EF0" : "#13172A",
      color: active ? "#fff" : "#3D4460",
      border: `1px solid ${active ? "#5B8EF0" : "#1E2338"}`,
      padding: "11px 24px",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: active ? "pointer" : "default",
      transition: "all 0.15s",
    }),
    ghost: {
      background: "transparent",
      color: "#5B8EF0",
      border: "1px solid #2A3A5E",
      padding: "10px 24px",
      borderRadius: 8,
      fontSize: 13,
      cursor: "pointer",
    },
    bar: {
      position: "sticky" as const,
      bottom: 16,
      background: "#12162A",
      border: "1px solid #1A2040",
      borderRadius: 10,
      padding: "13px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
    },
    error: { marginTop: 14, fontSize: 12, color: "#D06858", textAlign: "center" as const },
  };

  return (
    <div style={s.root}>
      <div style={s.eyebrow}>就活メール仕分け</div>
      <div style={s.title}>Inbox Triage</div>

      {phase === "idle" && (
        <div style={s.center}>
          <div style={{ ...s.muted, marginBottom: 28 }}>未読メールを取得して仕分けします</div>
          <button onClick={fetchAndClassify} style={s.btn(true)}>
            メールをチェック
          </button>
          {error && <div style={s.error}>{error}</div>}
        </div>
      )}

      {phase === "loading" && (
        <div style={{ ...s.center, ...s.muted }}>Gmailを確認中…</div>
      )}

      {phase === "classified" && (
        <>
          {emails.length === 0 && (
            <div style={{ ...s.center, ...s.muted }}>未読の就活メールはありません</div>
          )}

          {important.length > 0 && (
            <Section label="要対応" count={important.length} accent="#C06050">
              {important.map((e) => (
                <EmailCard key={e.threadId} email={e} selected={false} onToggle={() => {}} />
              ))}
            </Section>
          )}

          {ok.length > 0 && (
            <Section label="既読でOK" count={ok.length} accent="#3D4460">
              {ok.map((e) => (
                <EmailCard
                  key={e.threadId}
                  email={e}
                  selected={selected.has(e.threadId)}
                  onToggle={toggle}
                />
              ))}
            </Section>
          )}

          {ok.length > 0 && (
            <div style={s.bar}>
              <button
                onClick={toggleAll}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4A5270",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {selectedCount === ok.length ? "全解除" : "全選択"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#4A5270" }}>{selectedCount}通</span>
                <button onClick={markAsRead} style={s.btn(selectedCount > 0)}>
                  既読にする
                </button>
              </div>
            </div>
          )}

          {error && <div style={s.error}>{error}</div>}
        </>
      )}

      {phase === "marking" && (
        <div style={{ ...s.center, ...s.muted }}>既読に変更中…</div>
      )}

      {phase === "done" && (
        <div style={s.center}>
          <div style={{ fontSize: 36, marginBottom: 12, color: "#5B8EF0" }}>✓</div>
          <div style={{ fontSize: 15, color: "#CDD2E8", marginBottom: 6 }}>
            {markedCount}通を既読にしました
          </div>
          {important.length > 0 && (
            <div style={{ ...s.muted, marginBottom: 28 }}>
              要対応が{important.length}通あります
            </div>
          )}
          <button onClick={reset} style={s.ghost}>
            もう一度チェック
          </button>
        </div>
      )}
    </div>
  );
}
