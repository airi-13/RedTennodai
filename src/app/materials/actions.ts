"use server";

import { revalidatePath } from "next/cache";
import { createTextbook, deleteTextbook, updateTextbook } from "@/lib/data/textbooks";
import type { TextbookLevel, TextbookSubject } from "@/lib/data/textbooks";
import { upsertPricingRule } from "@/lib/data/pricing";
import { requireAdmin } from "@/lib/admin-auth";

function refresh() {
  revalidatePath("/materials");
  revalidatePath("/my/textbooks");
  revalidatePath("/my/pricing");
}

export async function createTextbookAction(input: {
  level: TextbookLevel;
  subjects: TextbookSubject[];
  title: string;
  publisher?: string;
  description?: string;
  grade_label: string;
}) {
  await requireAdmin();
  await createTextbook(input);
  refresh();
}

export async function updateTextbookAction(id: string, input: {
  level: TextbookLevel;
  subjects: TextbookSubject[];
  title: string;
  publisher?: string;
  description?: string;
  grade_label: string;
}) {
  await requireAdmin();
  await updateTextbook(id, input);
  refresh();
}

export async function deleteTextbookAction(id: string) {
  await requireAdmin();
  await deleteTextbook(id);
  refresh();
}

export async function upsertPricingRuleAction(input: {
  grade_label: string;
  price_per_slot: number;
}) {
  await requireAdmin();
  await upsertPricingRule(input);
  refresh();
}
