"use server";

import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { sortCompanies } from "@/lib/utils";
import { encryptForUser, isEncryptionKeyConfigured } from "@/lib/crypto/login-secret";
import type {
  Company,
  CompanyInsert,
  CompanyUpdate,
  CompanySortField,
  SortOrder,
} from "@/types";

// ログインパスワードは、平文の列（login_password）も暗号化した列（login_password_enc）も
// 画面やクライアントには返さない（toCompany で取り除く）。
// "*" で読むのは、暗号化の列を追加する前の DB でも動かすため（列がなければ単に含まれない）。
const COMPANY_COLUMNS = "*";

type CompanyRow = Omit<Company, "has_login_password"> & {
  login_password?: string | null;
  login_password_enc?: string | null;
};

/** DB の行からパスワードの値を取り除き、「保存されているか」だけを残す */
function toCompany(row: CompanyRow): Company {
  const { login_password_enc, login_password, ...rest } = row;
  return { ...rest, has_login_password: Boolean(login_password_enc || login_password) };
}

const CANNOT_SAVE_PASSWORD =
  "今はパスワードを保存できません（暗号化の準備中です）。パスワード以外の項目は、パスワード欄を空にすると保存できます。";

/** 暗号化の列がまだ無い DB に書こうとしたときのエラーか */
function isMissingEncColumn(error: { code?: string; message?: string }) {
  return (
    (error.code === "PGRST204" || error.code === "42703") &&
    (error.message ?? "").includes("login_password_enc")
  );
}

/**
 * 画面から届いた入力を、DB に書く形に直す。
 * - login_password（平文）は暗号化して login_password_enc にだけ入れる。平文の列は空にする
 * - 空欄なら何もしない（保存済みのパスワードを残す）
 * - clear_login_password なら両方の列を空にする
 */
function toDbInput(input: CompanyInsert | CompanyUpdate, userId: string) {
  const { login_password, clear_login_password, ...rest } = input as CompanyInsert & {
    login_password?: unknown;
    clear_login_password?: unknown;
  };
  const wantsSecretChange =
    clear_login_password === true ||
    (typeof login_password === "string" && login_password !== "");
  // 鍵がまだ無いときは、平文には書かずに断る
  if (wantsSecretChange && !isEncryptionKeyConfigured()) {
    throw new Error(CANNOT_SAVE_PASSWORD);
  }
  if (clear_login_password === true) {
    return { ...rest, login_password_enc: null, login_password: null };
  }
  if (typeof login_password === "string" && login_password !== "") {
    return {
      ...rest,
      login_password_enc: encryptForUser(login_password, userId),
      login_password: null,
    };
  }
  return rest;
}

export async function getCompanies(options?: {
  search?: string;
  status?: string;
  desiredLevel?: string;
  result?: string;
  sort?: CompanySortField;
  order?: SortOrder;
}) {
  const supabase = await createClient();
  let query = supabase.from("companies").select(COMPANY_COLUMNS);

  if (options?.search) {
    query = query.or(
      `name.ilike.%${options.search}%,industry.ilike.%${options.search}%,memo.ilike.%${options.search}%`
    );
  }
  if (options?.status) query = query.eq("status", options.status);
  if (options?.desiredLevel)
    query = query.eq("desired_level", options.desiredLevel);
  if (options?.result) query = query.eq("result", options.result);

  const { data, error } = await query.returns<CompanyRow[]>();
  if (error) throw new Error(error.message);

  const sort = options?.sort ?? "updated_at";
  const order = options?.order ?? "desc";
  return sortCompanies((data ?? []).map(toCompany), sort, order);
}

export async function getCompany(id: string) {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", id)
    .single<CompanyRow>();
  if (error) throw new Error(error.message);
  return toCompany(data);
}

export async function createCompany(input: CompanyInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...toDbInput(input, user.id), user_id: user.id })
    .select(COMPANY_COLUMNS)
    .single<CompanyRow>();
  if (error) throw new Error(isMissingEncColumn(error) ? CANNOT_SAVE_PASSWORD : error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${data.id}`);
  revalidatePath("/calendar");
  return toCompany(data);
}

export async function updateCompany(id: string, input: CompanyUpdate) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("companies")
    .update(toDbInput(input, user.id))
    .eq("id", id)
    .eq("user_id", user.id)
    .select(COMPANY_COLUMNS)
    .single<CompanyRow>();
  if (error) throw new Error(isMissingEncColumn(error) ? CANNOT_SAVE_PASSWORD : error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/calendar");
  return toCompany(data);
}

export async function deleteCompany(id: string) {
  const { supabase } = await getAuthedClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath("/calendar");
}

export async function getCalendarCompanyEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, deadline")
    .not("deadline", "is", null);
  if (error) throw new Error(error.message);
  return data ?? [];
}
