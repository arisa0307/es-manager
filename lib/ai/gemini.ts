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

ルール:
- 締切が近い/超過しているもの、結果待ちが長いもの、次アクション未設定で進行中のものを重視する。
- 各項目は action(20〜40字程度の具体的な行動)と、あれば company(企業名)、reason(なぜ今かの短い理由)を返す。
- サマリーに書かれた事実だけを使い、日付やイベントを創作しない。
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
