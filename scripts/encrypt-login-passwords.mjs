// 既存のログインパスワード（平文の列 login_password）を暗号化して login_password_enc に移す。
//
// 使い方（~/Documents/dev で実行）:
//   node scripts/encrypt-login-passwords.mjs check    … 件数を数えるだけ（書き込みなし）
//   node scripts/encrypt-login-passwords.mjs encrypt  … 未移行の行を暗号化して書き込み、続けて verify
//   node scripts/encrypt-login-passwords.mjs encrypt --only <企業id>
//                                                      … その1件だけ暗号化する（本番の鍵と同じかの試し用）
//   node scripts/encrypt-login-passwords.mjs verify   … 全件を復号して平文と一致するか確かめる（書き込みなし）
//   node scripts/encrypt-login-passwords.mjs clear    … verify が全件一致したときだけ、平文の列を空にする
//
// 必要な環境変数（.env.local から読む。値は表示しない）:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOGIN_PASSWORD_ENCRYPTION_KEY
//
// 決まりごと:
//   - パスワードの値（平文・暗号文とも）は、画面にもファイルにもログにも出さない。
//     出すのは件数と、問題があった行の企業 id だけ。
//   - 書き込みは「その行の今の値が、読んだときと同じ」ことを条件にする（途中で変わった行は触らない）。
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  decryptLoginPassword,
  encryptLoginPassword,
  KEY_ENV_NAME,
  parseKey,
} from "../lib/crypto/login-secret-core.mjs";

function loadEnvLocal() {
  let text = "";
  try {
    text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();
const mode = process.argv[2];
if (!["check", "encrypt", "verify", "clear"].includes(mode)) {
  console.error("使い方: node scripts/encrypt-login-passwords.mjs <check|encrypt|verify|clear>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です（.env.local）");
  process.exit(1);
}
let key;
try {
  key = parseKey(process.env[KEY_ENV_NAME]);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchRows() {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, user_id, login_password, login_password_enc")
      .not("login_password", "is", null)
      .order("id")
      .range(from, from + 499);
    if (error) throw new Error(`読み込みに失敗: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows;
}

/** 全件を復号して平文と比べる。値は出さない。 */
async function verify() {
  const rows = await fetchRows();
  const missing = [];
  const mismatch = [];
  let ok = 0;
  for (const r of rows) {
    if (!r.login_password_enc) {
      missing.push(r.id);
      continue;
    }
    let same = false;
    try {
      same = decryptLoginPassword(r.login_password_enc, r.user_id, key) === r.login_password;
    } catch {
      same = false;
    }
    if (same) ok++;
    else mismatch.push(r.id);
  }
  console.log(`verify: 平文あり ${rows.length} 件 / 一致 ${ok} 件 / 未移行 ${missing.length} 件 / 不一致 ${mismatch.length} 件`);
  if (missing.length) console.log(`  未移行の企業 id: ${missing.join(", ")}`);
  if (mismatch.length) console.log(`  不一致の企業 id: ${mismatch.join(", ")}`);
  return { total: rows.length, ok, missing, mismatch };
}

if (mode === "check") {
  const rows = await fetchRows();
  const done = rows.filter((r) => r.login_password_enc).length;
  console.log(`check: 平文あり ${rows.length} 件 / うち暗号化済み ${done} 件 / 未移行 ${rows.length - done} 件`);
}

if (mode === "encrypt") {
  const onlyIdx = process.argv.indexOf("--only");
  const onlyId = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;
  if (onlyIdx > 0 && !onlyId) {
    console.error("--only のあとに企業 id を指定してください");
    process.exit(1);
  }
  const rows = (await fetchRows()).filter(
    (r) => !r.login_password_enc && (!onlyId || r.id === onlyId)
  );
  let written = 0;
  const failed = [];
  for (const r of rows) {
    const enc = encryptLoginPassword(r.login_password, r.user_id, key);
    // 書く前に、手元で元に戻せることを確かめる
    if (decryptLoginPassword(enc, r.user_id, key) !== r.login_password) {
      failed.push(r.id);
      continue;
    }
    const { data, error } = await supabase
      .from("companies")
      .update({ login_password_enc: enc })
      .eq("id", r.id)
      .eq("login_password", r.login_password)
      .is("login_password_enc", null)
      .select("id");
    if (error || !data?.length) failed.push(r.id);
    else written++;
  }
  console.log(`encrypt: 対象 ${rows.length} 件 / 書き込み ${written} 件 / 失敗 ${failed.length} 件`);
  if (failed.length) console.log(`  失敗した企業 id: ${failed.join(", ")}`);
  await verify();
}

if (mode === "verify") {
  const r = await verify();
  process.exitCode = r.missing.length || r.mismatch.length ? 2 : 0;
}

if (mode === "clear") {
  const r = await verify();
  if (r.missing.length || r.mismatch.length || r.ok !== r.total) {
    console.log("clear: 全件一致していないため、平文の列は空にしません");
    process.exit(2);
  }
  // 一致を確かめた行だけを、行ごとに「暗号化した値が今も同じ」ことを条件に空にする
  const rows = await fetchRows();
  let cleared = 0;
  const failed = [];
  for (const row of rows) {
    const { data, error } = await supabase
      .from("companies")
      .update({ login_password: null })
      .eq("id", row.id)
      .eq("login_password_enc", row.login_password_enc)
      .select("id");
    if (error || !data?.length) failed.push(row.id);
    else cleared++;
  }
  console.log(`clear: 平文を空にした ${cleared} 件 / 失敗 ${failed.length} 件`);
  if (failed.length) console.log(`  失敗した企業 id: ${failed.join(", ")}`);
  const after = await fetchRows();
  console.log(`clear 後: 平文が残っている行 ${after.length} 件`);
}
