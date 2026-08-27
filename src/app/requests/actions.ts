"use server";

import { revalidatePath } from "next/cache";
import { approveRequest, setRequestStatus, cancelApprovedRequest } from "@/lib/data/requests";

export async function approveRequestAction(id: number): Promise<{ reflected: boolean }> {
  const result = await approveRequest(id);
  revalidatePath("/requests");
  revalidatePath("/attendance");
  revalidatePath("/my");
  return result;
}

export async function rejectRequestAction(id: number) {
  await setRequestStatus(id, "rejected");
  revalidatePath("/requests");
}

export async function cancelApprovedRequestAction(id: number) {
  await cancelApprovedRequest(id);
  revalidatePath("/requests");
  revalidatePath("/attendance");
  revalidatePath("/my");
}
