"use server";

import { revalidatePath } from "next/cache";
import { setRequestStatus } from "@/lib/data/requests";

export async function approveRequestAction(id: number) {
  await setRequestStatus(id, "approved");
  revalidatePath("/requests");
}

export async function rejectRequestAction(id: number) {
  await setRequestStatus(id, "rejected");
  revalidatePath("/requests");
}
