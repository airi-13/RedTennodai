"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthed } from "@/lib/admin-auth";
import { deleteSchoolEvent } from "@/lib/data/school-events";
import { deleteAnnouncement, clearClosure } from "@/lib/data/announcements";
import { deleteCalendarEvent } from "@/lib/data/calendar-events";
import { deleteTodo } from "@/lib/data/admin-todos";
import { deleteNotice } from "@/lib/data/notices";

// ダッシュボードの「編集モード」で選択した予定を、種類をまたいでまとめて削除するための型。
export type DeletableItem =
  | { type: "school_event" | "announcement" | "todo" | "notice"; id: string }
  | { type: "calendar_event"; id: number }
  | { type: "closure"; date: string };

const MAX_ITEMS = 200;

export async function deleteCalendarItemsAction(
  items: DeletableItem[]
): Promise<{ deleted: number; failed: number; error?: string }> {
  // 破壊的な操作なので、管理者としてログインしていることをここでも確認する
  if (!(await isAdminAuthed())) {
    return { deleted: 0, failed: items.length, error: "管理者としてログインし直してください。" };
  }
  if (items.length === 0) return { deleted: 0, failed: 0 };
  if (items.length > MAX_ITEMS) {
    return { deleted: 0, failed: items.length, error: `一度に削除できるのは${MAX_ITEMS}件までです。` };
  }

  const results = await Promise.allSettled(
    items.map((item) => {
      switch (item.type) {
        case "school_event":
          return deleteSchoolEvent(item.id);
        case "announcement":
          return deleteAnnouncement(item.id);
        case "todo":
          return deleteTodo(item.id);
        case "notice":
          return deleteNotice(item.id);
        case "calendar_event":
          return deleteCalendarEvent(item.id);
        case "closure":
          return clearClosure(item.date);
      }
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  for (const r of results) {
    if (r.status === "rejected") console.error("deleteCalendarItemsAction failed:", r.reason);
  }

  revalidatePath("/dashboard");
  revalidatePath("/my");
  revalidatePath("/attendance");
  return { deleted: results.length - failed, failed };
}
