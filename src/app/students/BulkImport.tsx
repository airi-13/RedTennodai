"use client";

import { useState, useTransition } from "react";
import { SpreadsheetStudentEditor } from "./SpreadsheetStudentEditor";
import { bulkCreateStudentsAction } from "./actions";

export function BulkImport() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function register(rows: string[][]) {
    setMessage(null);
    try {
      const gradeMap: Record<string, string> = { 小: "小学生", 中: "中学生", 高: "高校生" };
      const payload = rows.map((row, index) => {
        const gradeText = row[7]?.trim() ?? "";
        const m = gradeText.match(/^(小|中|高)(\d+)$/);
        if (!m) throw new Error(`${index + 1}行目：学年「${gradeText}」は「高2」「中3」「小6」の形式で入力してください`);
        if (!row[0]?.trim() || !row[2]?.trim() || !row[3]?.trim() || !row[8]?.trim()) {
          throw new Error(`${index + 1}行目：生徒ID・姓・名・Passは必須です`);
        }
        return {
          loginId: row[0].trim(),
          gender: row[1]?.trim() || null,
          name: `${row[2].trim()} ${row[3].trim()}`,
          nameKana: `${row[4]?.trim() ?? ""} ${row[5]?.trim() ?? ""}`.trim() || null,
          schoolName: row[6]?.trim() || null,
          schoolLevel: gradeMap[m[1]],
          grade: Number(m[2]),
          password: row[8].trim(),
          subjectsText: row[9]?.trim() || null,
          lessonCountText: row[10]?.trim() || null,
          scheduleText: row[11]?.trim() || null,
        };
      });

      startTransition(async () => {
        try {
          const results = await bulkCreateStudentsAction(payload);
          const success = results.filter((r) => r.ok).length;
          const failed = results.length - success;
          setMessage(`${success}件登録しました${failed ? `（${failed}件エラー）` : ""}`);
        } catch (e: any) {
          setMessage(e?.message ?? "一括登録に失敗しました");
        }
      });
    } catch (e: any) {
      setMessage(e?.message ?? "入力内容を確認してください");
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <button onClick={() => setOpen((v) => !v)} className="text-sm font-medium underline">
        {open ? "生徒一括入力を閉じる" : "生徒を表で一括入力"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-[var(--color-ink-soft)]">
            Excel / Googleスプレッドシートから12列をコピーして、表の左上セルへ貼り付けてください。貼り付け後は各セルを直接編集できます。登録ボタンを押すまでDBには保存されません。
          </p>
          <SpreadsheetStudentEditor onRegister={async (rows) => register(rows)} />
          {isPending && <p className="text-xs text-[var(--color-ink-soft)]">登録中…</p>}
          {message && <p className="text-sm">{message}</p>}
        </div>
      )}
    </div>
  );
}
