"use server";

import { revalidatePath } from "next/cache";
import { setClosure, clearClosure, createAnnouncement, deleteAnnouncement } from "@/lib/data/announcements";
import { findOrCreateSchoolByName, deleteSchool } from "@/lib/data/schools";
import { createSchoolEvent, deleteSchoolEvent } from "@/lib/data/school-events";
import { createTodo, toggleTodoDone, deleteTodo } from "@/lib/data/admin-todos";
import { createNotice, deleteNotice } from "@/lib/data/notices";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventType,
  type CalendarEventVisibility,
} from "@/lib/data/calendar-events";

function refresh() {
  revalidatePath("/admin-calendar");
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/my");
}

export async function createCalendarEventAction(input: {
  eventType: CalendarEventType;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  periodId?: number | null;
  subjectId?: number | null;
  title: string;
  note?: string | null;
  visibility: CalendarEventVisibility;
  studentIds?: number[];
}) {
  if (input.eventType === "lesson" && (!input.periodId || !input.subjectId)) {
    throw new Error("単発授業にはコマと科目の指定が必要です。");
  }
  if (input.eventType === "lesson" && input.visibility !== "all" && (!input.studentIds || input.studentIds.length === 0)) {
    throw new Error("単発授業は対象の生徒を1人以上選んでください。");
  }
  await createCalendarEvent(input);
  refresh();
}

export async function deleteCalendarEventAction(id: number) {
  await deleteCalendarEvent(id);
  refresh();
}

export async function createNoticeAction(input: { title: string; body?: string }) {
  await createNotice(input);
  refresh();
}
export async function deleteNoticeAction(id: string) {
  await deleteNotice(id);
  refresh();
}

export async function setClosureAction(date: string, status: "closed" | "open", note?: string) {
  await setClosure(date, status, note);
  refresh();
}
export async function clearClosureAction(date: string) {
  await clearClosure(date);
  refresh();
}

export async function createAnnouncementAction(input: {
  event_date: string;
  title: string;
  time_range?: string;
  note?: string;
}) {
  await createAnnouncement(input);
  refresh();
}
export async function deleteAnnouncementAction(id: string) {
  await deleteAnnouncement(id);
  refresh();
}

export async function createSchoolEventAction(input: {
  schoolName: string;
  event_date: string;
  title: string;
  note?: string;
}) {
  const school = await findOrCreateSchoolByName(input.schoolName);
  await createSchoolEvent({
    school_id: school.id,
    event_date: input.event_date,
    title: input.title,
    note: input.note,
  });
  refresh();
}
export async function deleteSchoolEventAction(id: string) {
  await deleteSchoolEvent(id);
  refresh();
}
export async function deleteSchoolAction(id: string) {
  await deleteSchool(id);
  refresh();
}

export async function createTodoAction(input: { todo_date: string; content: string }) {
  await createTodo(input);
  refresh();
}
export async function toggleTodoAction(id: string, done: boolean) {
  await toggleTodoDone(id, done);
  refresh();
}
export async function deleteTodoAction(id: string) {
  await deleteTodo(id);
  refresh();
}
