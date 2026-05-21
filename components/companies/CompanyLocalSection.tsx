"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  getCompanyLocalData,
  setCompanyLocalData,
} from "@/lib/local-storage";
import type { CompanyLocalData } from "@/types";

export function CompanyLocalSection({ companyId }: { companyId: string }) {
  const [data, setData] = useState<CompanyLocalData>({});
  const [status, setStatus] = useState<"saved" | "idle">("idle");
  const loadedSnapshot = useRef("");
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
    queueMicrotask(() => {
      const loaded = getCompanyLocalData(companyId);
      setData(loaded);
      loadedSnapshot.current = JSON.stringify(loaded);
      hydrated.current = true;
      setStatus("idle");
    });
  }, [companyId]);

  useEffect(() => {
    if (!hydrated.current) return;

    const serialized = JSON.stringify(data);
    if (serialized === loadedSnapshot.current) return;

    const timer = setTimeout(() => {
      setCompanyLocalData(companyId, data);
      loadedSnapshot.current = serialized;
      setStatus("saved");
    }, 400);

    return () => clearTimeout(timer);
  }, [companyId, data]);

  useEffect(() => {
    if (status !== "saved") return;
    const hide = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(hide);
  }, [status]);

  const update = (key: keyof CompanyLocalData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card>
        <h3 className="text-sm font-medium mb-3">Webテスト情報</h3>
        <p className="text-xs text-muted-foreground mb-3">
          この端末のブラウザに自動保存されます（サーバーには送信しません）
        </p>
        <div className="space-y-2">
          <Field label="URL">
            <Input
              value={data.webTestUrl ?? ""}
              onChange={(e) => update("webTestUrl", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="メモ">
            <Textarea
              value={data.webTestNotes ?? ""}
              onChange={(e) => update("webTestNotes", e.target.value)}
              rows={3}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-medium mb-3">ID / Password</h3>
        <p className="text-xs text-muted-foreground mb-3">
          入力すると自動でローカルに保存されます
        </p>
        <div className="space-y-2">
          <Field label="ID">
            <Input
              value={data.loginId ?? ""}
              onChange={(e) => update("loginId", e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={data.loginPassword ?? ""}
              onChange={(e) => update("loginPassword", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="sm:col-span-2">
        <p className="text-xs text-muted-foreground">
          {status === "saved" && "保存しました ✓"}
          {status === "idle" &&
            "※ 同じ企業（同じID）のページでのみ表示されます。別端末・別URL（localhost / 本番）では共有されません"}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
