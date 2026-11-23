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

/** 暗号化の鍵が環境変数に正しく入っているか（値は返さない） */
export function isEncryptionKeyConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptForUser(plaintext: string, userId: string): string {
  return encryptLoginPassword(plaintext, userId, key());
}

export function decryptForUser(stored: string, userId: string): string {
  return decryptLoginPassword(stored, userId, key());
}
