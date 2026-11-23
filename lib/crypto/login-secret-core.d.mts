export declare const KEY_ENV_NAME: "LOGIN_PASSWORD_ENCRYPTION_KEY";
export declare function parseKey(raw: string | undefined): Buffer;
export declare function encryptLoginPassword(
  plaintext: string,
  userId: string | null | undefined,
  key: Buffer
): string;
export declare function decryptLoginPassword(
  stored: string,
  userId: string | null | undefined,
  key: Buffer
): string;
