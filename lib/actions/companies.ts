"use server";

import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { sortCompanies } from "@/lib/utils";
import type {
  CompanyInsert,
  CompanyUpdate,
  CompanySortField,
  SortOrder,
} from "@/types";

// login_password 列は保存済みの値を残したまま、画面やクライアントには一切返さない。
const COMPANY_COLUMNS =
  "id, name, industry, url, desired_level, status, result, salary, next_action, deadline, memo, internship_name, internship_location, internship_memo, web_test_url, web_test_notes, login_id, progress_note, interview_prep, user_id, created_at, updated_at";

/** 古い画面などから送られてきても、ログインパスワードは保存しない */
function withoutLoginPassword<T extends object>(input: T): T {
  const rest = { ...input } as T & { login_password?: unknown };
  delete rest.login_password;
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

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const sort = options?.sort ?? "updated_at";
  const order = options?.order ?? "desc";
  return sortCompanies(data ?? [], sort, order);
}

export async function getCompany(id: string) {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createCompany(input: CompanyInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...withoutLoginPassword(input), user_id: user.id })
    .select(COMPANY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${data.id}`);
  revalidatePath("/calendar");
  return data;
}

export async function updateCompany(id: string, input: CompanyUpdate) {
  const { supabase } = await getAuthedClient();
  const { data, error } = await supabase
    .from("companies")
    .update(withoutLoginPassword(input))
    .eq("id", id)
    .select(COMPANY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/calendar");
  return data;
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
