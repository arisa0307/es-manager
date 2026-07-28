"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  ESInsert,
  ESSubmissionInsert,
  ESSubmissionUpdate,
  ESSubmissionWithDetails,
  ESUpdate,
} from "@/types";

const ES_BUCKET = "es-files";

// ---- ES提出(応募) ----

export async function getESSubmissions(
  companyId?: string
): Promise<ESSubmissionWithDetails[]> {
  const supabase = await createClient();
  let query = supabase
    .from("es_submissions")
    .select("*, companies(id, name), es(*)")
    .order("updated_at", { ascending: false });
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ESSubmissionWithDetails[];
}

export async function createESSubmission(input: ESSubmissionInsert) {
  const { supabase, user } = await getAuthedClient();
  const { data, error } = await supabase
    .from("es_submissions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/es");
  revalidatePath(`/companies/${input.company_id}`);
  return data;
}

export async function updateESSubmission(id: string, input: ESSubmissionUpdate) {
  const { supabase } = await getAuthedClient();
  const { data, error } = await supabase
    .from("es_submissions")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/es");
  if (data?.company_id) revalidatePath(`/companies/${data.company_id}`);
  return data;
}

export async function deleteESSubmission(id: string) {
  const { supabase } = await getAuthedClient();
  const { data: row } = await supabase
    .from("es_submissions")
    .select("company_id, file_path")
    .eq("id", id)
    .single();
  if (row?.file_path) {
    await supabase.storage.from(ES_BUCKET).remove([row.file_path]);
  }
  const { error } = await supabase.from("es_submissions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/es");
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`);
}

/** 非公開バケットの添付を一時的に閲覧するための署名付きURL */
export async function getEsFileUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ES_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ---- 設問(ES) ----

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
