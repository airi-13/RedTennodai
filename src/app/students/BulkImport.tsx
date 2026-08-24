"use client";

import { useState, useTransition } from "react";
import { parsePastedStudents, type ParsedStudentRow } from "@/lib/bulk-import";
import { bulkCreateStudentsAction } from "./actions";

export function BulkImport() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedStudentRow[] | null>(null);
  const [results, setResults] = useState<{ loginId: string; ok: boolean; error?: string }[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const validRows = (parsed ?? []).filter((r) => r.ok);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <button onClick={() => setOpen(!open)} className="text-sm font-medium underline">
        {open ? "一括登録を閉じる" : "スプレッドシートから一括登録"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-[var(--color-ink-soft)]">
            スプレッドシートの「生徒ID・性・姓・名・セイ・メイ・学校・学年・Pass」の9列をそのまま範囲選択してコピーし、下に貼り付けてください。学年は「高2」「中3」「小6」のような表記にしてください。
          </p>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsed(null);
              setResults(null);
            }}
            rows={6}
            placeholder="ここに貼り付け"
            className="w-full rounded-md border border-[var(--color-border)] p-2 font-mono text-xs"
          />
          <button
            onClick={() => setParsed(parsePastedStudents(text))}
            disabled={!text.trim()}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
          >
            プレビュー
          </button>

          {parsed && (
            <div className="space-y-2">
              <p className="text-sm">
                {parsed.length}行中 {validRows.length}行が登録可能です
                {parsed.length !== validRows.length && "(エラーの行はスキップされます)"}
              </p>
              <div className="max-h-64 overflow-auto rounded-md border border-[var(--color-border)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-bg)]">
                    <tr>
                      <th className="px-2 py-1">行</th>
                      <th className="px-2 py-1">状態</th>
                      <th className="px-2 py-1">氏名 / ID</th>
                      <th className="px-2 py-1">詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((r) => (
                      <tr key={r.lineNumber} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-1">{r.lineNumber}</td>
                        <td className="px-2 py-1">
                          {r.ok ? (
                            <span style={{ color: "var(--color-present)" }}>OK</span>
                          ) : (
                            <span style={{ color: "var(--color-absent)" }}>エラー</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {r.ok ? `${r.data!.name} / ${r.data!.loginId}` : "-"}
                        </td>
                        <td className="px-2 py-1 text-[var(--color-ink-soft)]">
                          {r.ok
                            ? `${r.data!.schoolLevel}${r.data!.grade}年 / ${r.data!.schoolName ?? "学校未入力"}`
                            : r.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                disabled={isPending || validRows.length === 0}
                onClick={() =>
                  startTransition(async () => {
                    const res = await bulkCreateStudentsAction(
                      validRows.map((r) => r.data!)
                    );
                    setResults(res);
                  })
                }
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--color-accent)" }}
              >
                {validRows.length}件を登録する
              </button>
            </div>
          )}

          {results && (
            <div className="space-y-1 rounded-md bg-[var(--color-bg)] p-2 text-sm">
              {results.map((r) => (
                <p key={r.loginId}>
                  {r.ok ? "✓" : "✗"} {r.loginId}
                  {!r.ok && ` — ${r.error}`}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
