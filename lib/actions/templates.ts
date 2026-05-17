"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ESTemplateInsert, ESTemplateUpdate } from "@/types";

export async function getTemplates(search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("es_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,question.ilike.%${search}%,answer.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getTemplate(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("es_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createTemplate(input: ESTemplateInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("es_templates")
    .insert({ ...input, tags: input.tags ?? [] })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  return data;
}

export async function updateTemplate(id: string, input: ESTemplateUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("es_templates")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  return data;
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("es_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
}
