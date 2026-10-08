This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 外部API

### 認証

`/api/events` と `/api/health` は、カレンダー購読と同じ Bearer トークン方式で認証する。
トークンは `calendar_subscriptions.token`（ユーザーごとに発行済み）を使う。

### ヘルスケアデータの取り込み（`POST /api/health`）

iPhone のショートカットなどから、その日の体重・摂取カロリー・アクティブカロリー・歩数を送る。
同じ `logDate` があれば条件付きで upsert する:

- 値が `null` / 未指定 / `0` の項目は「未計測」とみなし、既存の値を上書きしない（初回保存時も `0` は `null` として保存）
- 摂取カロリーは、`0` や未送信では既存値を保持し、非0でより大きい値が来たときだけ更新する（1日の累計を想定）
- 更新のたびに `updated_at` を記録する
- 受信した生のリクエスト本文は `health_log_requests`（`user_id` ごと・`received_at` 降順）に記録され、ショートカットが実際に何を送ったか後から確認できる

リクエストボディ（JSON）:

| フィールド    | 型     | 必須 | 説明                       |
| ------------- | ------ | ---- | -------------------------- |
| `logDate`     | string | ○    | `YYYY-MM-DD`               |
| `weightKg`    | number |      | 体重(kg)                   |
| `intakeKcal`  | number |      | 摂取カロリー(kcal)         |
| `activeKcal`  | number |      | アクティブカロリー(kcal)   |
| `steps`       | number |      | 歩数                       |

curl での送信例:

```bash
curl -X POST https://<your-app>.vercel.app/api/health \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "logDate": "2026-09-27",
    "weightKg": 58.4,
    "intakeKcal": 1850,
    "activeKcal": 520,
    "steps": 8123
  }'
```

iPhone ショートカットでは「URLの内容を取得」アクションで、
メソッド `POST`、ヘッダ `Authorization: Bearer <YOUR_TOKEN>`、
本文を JSON にして上記フィールドを渡す。
