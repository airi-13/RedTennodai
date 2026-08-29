export const ADDITIONAL_REQUEST_LABEL = {
  textbook_purchase: "テキストの追加購入",
  interview: "面談の希望",
  lesson_count_change: "コマ数の変更",
  fixed_slot_change: "固定コマの変更",
} as const;

export type StudentRequest = {
  id: number;
  student_id: number;
  request_type: keyof typeof ADDITIONAL_REQUEST_LABEL;
  details: Record<string, string>;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at: string | null;
  studentName: string;
};
