// Webテストのログインパスワードを暗号化・復号する（AES-256-GCM）。
// サーバー専用。アプリ（lib/crypto/login-secret.ts）と移し替えスクリプト
// （scripts/encrypt-login-passwords.mjs）の両方がこのファイルを使う。
//
// 保存形式: "v1:" + base64( IV 12バイト | 認証タグ 16バイト | 暗号文 )
//   - IV は毎回ランダムに作る（同じパスワードでも毎回ちがう値になる）
//   - 追加認証データ（AAD）に持ち主の user_id を入れる。別の人の行へ値を
//     書き写しても復号できない（認証タグの検証で失敗する）
//
// 鍵: 環境変数 LOGIN_PASSWORD_ENCRYPTION_KEY（base64 で 32 バイト）。
//     NEXT_PUBLIC_ を付けないので、ブラウザには渡らない。
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const KEY_ENV_NAME = "LOGIN_PASSWORD_ENCRYPTION_KEY";
const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** @param {string | undefined} raw */
export function parseKey(raw) {
  const value = (raw ?? "").trim();
  if (!value) {
    throw new Error(`${KEY_ENV_NAME} が設定されていません`);
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV_NAME} は base64 で 32 バイト（256 ビット）の値にしてください`);
  }
  return key;
}

/** @param {string | null | undefined} userId */
function aad(userId) {
  return Buffer.from(`login_password:${userId ?? ""}`, "utf8");
}

/**
 * @param {string} plaintext
 * @param {string | null | undefined} userId 持ち主（行の user_id）
 * @param {Buffer} key
 * @returns {string}
 */
export function encryptLoginPassword(plaintext, userId, key) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(userId));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

/**
 * @param {string} stored encryptLoginPassword の戻り値
 * @param {string | null | undefined} userId 持ち主（行の user_id）
 * @param {Buffer} key
 * @returns {string}
 */
export function decryptLoginPassword(stored, userId, key) {
  const [version, body] = stored.split(":", 2);
  if (version !== VERSION || !body) throw new Error("暗号化された値の形式が不正です");
  const buf = Buffer.from(body, "base64");
  if (buf.length < IV_BYTES + TAG_BYTES) throw new Error("暗号化された値が短すぎます");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const data = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(aad(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
