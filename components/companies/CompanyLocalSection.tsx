"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  getCompanyLocalData,
  setCompanyLocalData,
} from "@/lib/local-storage";
import type { CompanyLocalData } from "@/types";

export function CompanyLocalSection({ companyId }: { companyId: string }) {
  const [data, setData] = useState<CompanyLocalData>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setData(getCompanyLocalData(companyId));
  }, [companyId]);

  const save = () => {
    setCompanyLocalData(companyId, data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: keyof CompanyLocalData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card>
        <h3 className="text-sm font-medium mb-3">Webテスト情報</h3>
        <p className="text-xs text-muted-foreground mb-3">
          この端末の localStorage にのみ保存されます
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
          ローカル保存のみ（サーバーには送信しません）
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
        <Button onClick={save}>{saved ? "保存しました ✓" : "ローカルに保存"}</Button>
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
