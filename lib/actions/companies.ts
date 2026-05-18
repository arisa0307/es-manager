"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sortCompanies } from "@/lib/utils";
import type {
  CompanyInsert,
  CompanyUpdate,
  CompanySortField,
  SortOrder,
} from "@/types";

export async function getCompanies(options?: {
  search?: string;
  status?: string;
  desiredLevel?: string;
  sort?: CompanySortField;
  order?: SortOrder;
}) {
  const supabase = await createClient();
  let query = supabase.from("companies").select("*");

  if (options?.search) {
    query = query.or(
      `name.ilike.%${options.search}%,industry.ilike.%${options.search}%,memo.ilike.%${options.search}%`
    );
  }
  if (options?.status) query = query.eq("status", options.status);
  if (options?.desiredLevel)
    query = query.eq("desired_level", options.desiredLevel);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const sort = options?.sort ?? "updated_at";
  const order = options?.order ?? "desc";
  return sortCompanies(data ?? [], sort, order);
}

export async function getCompany(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createCompany(input: CompanyInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath("/calendar");
  return data;
}

export async function updateCompany(id: string, input: CompanyUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/calendar");
  return data;
}

export async function deleteCompany(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath("/calendar");
}

export async function getCompanyStats() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("status, desired_level");
  if (error) throw new Error(error.message);

  const byStatus: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  for (const row of data ?? []) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    if (row.desired_level) {
      byLevel[row.desired_level] = (byLevel[row.desired_level] ?? 0) + 1;
    }
  }
  return { total: data?.length ?? 0, byStatus, byLevel };
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
