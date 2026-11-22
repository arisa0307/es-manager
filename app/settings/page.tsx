import { PageHeader } from "@/components/layout/PageHeader";
import { FeatureToggles } from "@/components/settings/FeatureToggles";
import { Card } from "@/components/ui/Card";
import { getFeatureFlags } from "@/lib/features-server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const flags = await getFeatureFlags();

  return (
    <>
      <PageHeader title="設定" description="使う機能を自分で選べます" />
      <Card>
        <h2 className="text-sm font-medium text-foreground">追加の機能</h2>
        <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
          企業・ES・タスク・予定・カレンダーなどの基本機能はいつでも使えます。ここでは、使い方に合わせて追加できる機能を選べます。
          オフにしても入力したデータは消えず、オンに戻すと元どおり表示されます。
        </p>
        <FeatureToggles flags={flags} />
      </Card>
    </>
  );
}
