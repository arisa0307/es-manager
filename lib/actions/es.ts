"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { ESInsert, ESUpdate } from "@/types";

export async function getESList(search?: string, companyId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("es")
    .select("*, companies(id, name)")
    .order("updated_at", { ascending: false });

  if (companyId) query = query.eq("company_id", companyId);
  if (search) {
    query = query.or(
      `question.ilike.%${search}%,answer.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getESByCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("es")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createES(input: ESInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("es")
    .insert({ ...input, tags: input.tags ?? [], user_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/es");
  revalidatePath(`/companies/${input.company_id}`);
  return data;
}

export async function updateES(id: string, input: ESUpdate) {
  const { supabase } = await getAuthedClient();
  const { data, error } = await supabase
    .from("es")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/es");
  if (data?.company_id) revalidatePath(`/companies/${data.company_id}`);
  return data;
}

export async function deleteES(id: string) {
  const { supabase } = await getAuthedClient();
  const { data: row } = await supabase
    .from("es")
    .select("company_id")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("es").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/es");
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`);
}
