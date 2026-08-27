"use client";

import { useActionState, useState } from "react";
import { submitAdditionalRequestAction } from "./actions";

type Textbook = { id: number; title: string };
type Schedule = { id: number; day_of_week: number; period_id: number; subject_id: number };
type Period = { id: number; name: string };

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const INITIAL = { error: "" };

export function AdditionalRequestForm({
  textbooks,
  schedules,
  periods,
}: {
  textbooks: Textbook[];
  schedules: Schedule[];
  periods: Period[];
}) {
  const [type, setType] = useState("textbook_purchase");
  const [state, formAction, pending] = useActionState(submitAdditionalRequestAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-white p-5">
      <label className="block text-sm font-medium">
        申請内容
        <select value={type} onChange={(e) => setType(e.target.value)} name="requestType" className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
          <option value="textbook_purchase">テキストの追加購入</option>
          <option value="interview">面談の希望</option>
          <option value="lesson_count_change">コマ数の変更</option>
          <option value="fixed_slot_change">固定コマの変更</option>
        </select>
      </label>

      {type === "textbook_purchase" && (
        <div className="space-y-3">
          <label className="block text-sm">購入するテキスト<select name="textbookId" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue=""><option value="">選択してください</option>{textbooks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
          <label className="block text-sm">冊数<input name="quantity" type="number" min="1" max="10" defaultValue="1" className="mt-1 w-28 rounded-md border px-3 py-2 text-sm" /></label>
        </div>
      )}

      {type === "interview" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">希望日<input name="preferredDate" type="date" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" /></label>
          <label className="block text-sm">希望時間帯<input name="preferredTime" type="text" placeholder="例：17:00〜19:00" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" /></label>
        </div>
      )}

      {type === "lesson_count_change" && (
        <label className="block text-sm">希望する週のコマ数<select name="desiredCount" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue=""><option value="">選択してください</option>{[0,1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n}コマ</option>)}</select></label>
      )}

      {type === "fixed_slot_change" && (
        <div className="space-y-3">
          <label className="block text-sm">変更する現在の固定コマ<select name="currentScheduleId" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue=""><option value="">選択してください</option>{schedules.map((s) => <option key={s.id} value={s.id}>{DAYS[s.day_of_week]}曜 {periods.find((p) => p.id === s.period_id)?.name ?? ""}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">変更後の曜日<select name="desiredDayOfWeek" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue=""><option value="">選択してください</option>{DAYS.map((d, i) => <option key={i} value={i}>{d}曜日</option>)}</select></label>
            <label className="block text-sm">変更後のコマ<select name="desiredPeriodId" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" defaultValue=""><option value="">選択してください</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          </div>
        </div>
      )}

      <label className="block text-sm">備考・希望内容<textarea name="reason" rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="その他、教室に伝えたいことがあれば入力してください" /></label>

      {state.error && <p className="text-sm text-[var(--color-absent)]">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
        {pending ? "送信中…" : "申請する"}
      </button>
    </form>
  );
}
