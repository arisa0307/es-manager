// サーバー専用（Server Action / Server Component からだけ使う）。
// 暗号化の本体は login-secret-core.mjs（移し替えスクリプトと共通）。
import {
  decryptLoginPassword,
  encryptLoginPassword,
  parseKey,
} from "./login-secret-core.mjs";

function key(): Buffer {
  return parseKey(process.env.LOGIN_PASSWORD_ENCRYPTION_KEY);
}

export function encryptForUser(plaintext: string, userId: string): string {
  return encryptLoginPassword(plaintext, userId, key());
}

export function decryptForUser(stored: string, userId: string): string {
  return decryptLoginPassword(stored, userId, key());
}
