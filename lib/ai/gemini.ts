import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY が未設定です");
  return new GoogleGenAI({ apiKey });
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
}

const NEXT_ACTIONS_PROMPT = `あなたは就活生のアシスタントです。渡された「就活の状況サマリー」をもとに、
今日〜近日中に取り組むべきことを、優先度の高い順に最大5件、日本語で提案してください。

優先順位の付け方:
- 締切を過ぎている / 今日〜数日内に締切があるものを最優先。
- 同じくらいの締切なら、志望度が高い企業(S > A > B > C > D)を優先する。
  「ワンチャン枠」「多様性」は志望度が高い企業より後回しでよい。
- 作業量を考慮する: ESの作成・提出は時間がかかるため、締切当日ではなく数日前から着手を促す。
  Webテスト(SPI等)は受検枠の確保や受検時間も要る。面接は前日までに準備時間が要る。
  逆にマイページ登録・エントリーなど短時間で終わるものは、締切間際でも後回しでよい。
- 締切が同じ週に集中している場合は、着手順や分散を具体的に助言する。
- 「結果待ち」が続いているものは、状況確認や次の準備を促す。

書き方のルール:
- 各項目は action(20〜40字程度の具体的な行動)、company(企業名。無ければ空文字)、
  reason(なぜ今それかを、締切・志望度・所要時間のどれに基づくか分かるように1文)。
- サマリーに書かれた事実だけを使い、日付・企業・イベントを創作しない。
- 「次のアクションが未設定」のような、データの入力漏れを指摘するだけの項目は出さない。
- 該当が乏しい場合は無理に5件出さず、確度の高いものだけにする。
必ず指定のJSONスキーマで出力すること。`;

const NEXT_ACTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          company: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["action", "company", "reason"],
        propertyOrdering: ["action", "company", "reason"],
      },
    },
  },
  required: ["actions"],
  propertyOrdering: ["actions"],
};

export type AiNextAction = {
  action: string;
  company: string;
  reason: string;
};

/**
 * 就活状況のテキストサマリーを渡し、Geminiに「次にやること」を優先度順で生成させる。
 * 失敗時は呼び出し側でフォールバックできるよう例外を投げる。
 */
export async function generateNextActions(
  summary: string
): Promise<AiNextAction[]> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: getModel(),
    contents: `就活の状況サマリー:\n${summary}`,
    config: {
      systemInstruction: NEXT_ACTIONS_PROMPT,
      responseMimeType: "application/json",
      responseSchema: NEXT_ACTIONS_SCHEMA,
      temperature: 0.3,
    },
  });

  const text = response.text?.trim();
  if (!text) return [];
  const parsed = JSON.parse(text) as { actions?: AiNextAction[] };
  return (parsed.actions ?? []).filter((a) => a.action?.trim());
}
