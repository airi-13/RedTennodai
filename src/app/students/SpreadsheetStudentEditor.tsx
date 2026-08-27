"use client";

import { useMemo, useState } from "react";

const COLUMNS = ["生徒ID", "性", "姓", "名", "ｾｲ", "ﾒｲ", "学校", "学年", "Pass", "授業科目", "授業数", "授業コマ"];

type Props = { onRegister?: (rows: string[][]) => Promise<void> };

function parseClipboard(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.length > 0).map((line) => line.split("\t"));
}

export function SpreadsheetStudentEditor({ onRegister }: Props) {
  const [rows, setRows] = useState<string[][]>([Array(COLUMNS.length).fill("")]);
  const [message, setMessage] = useState<string | null>(null);

  const normalized = useMemo(() => rows.map((row) => [...row, ...Array(Math.max(0, COLUMNS.length - row.length)).fill("")].slice(0, COLUMNS.length)), [rows]);

  function updateCell(r: number, c: number, value: string) {
    setRows((current) => current.map((row, ri) => ri === r ? Object.assign([...row, ...Array(COLUMNS.length - row.length).fill("")], { [c]: value }) : row));
    setMessage(null);
  }

  function pasteAt(r: number, c: number, text: string) {
    const pasted = parseClipboard(text);
    setRows((current) => {
      const next = current.map((row) => [...row]);
      pasted.forEach((line, rr) => {
        const target = r + rr;
        while (next.length <= target) next.push([]);
        line.forEach((value, cc) => { if (c + cc < COLUMNS.length) next[target][c + cc] = value; });
      });
      return next;
    });
    setMessage(`${pasted.length}行を貼り付けました`);
  }

  function addRow() { setRows((current) => [...current, []]); }
  function removeRow(index: number) { setRows((current) => current.filter((_, i) => i !== index)); }

  async function register() {
    const data = normalized.filter((row) => row.some((v) => v.trim()));
    if (!data.length) return setMessage("登録するデータがありません");
    const invalid = data.findIndex((row) => !row[0].trim() || !row[3].trim() || !row[8].trim());
    if (invalid >= 0) return setMessage(`${invalid + 1}行目：生徒ID・名・Passは必須です`);
    if (onRegister) await onRegister(data);
    setMessage(`${data.length}件を登録しました`);
  }

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">生徒を表で入力</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Excel / Googleスプレッドシートから範囲をコピーして、左上セルへ貼り付けできます。</p>
        </div>
        <button onClick={register} className="rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: "var(--color-accent)" }}>登録</button>
      </div>
      <div className="overflow-auto rounded-md border border-[var(--color-border)]">
        <table className="min-w-[1200px] border-collapse text-xs">
          <thead className="sticky top-0 bg-[var(--color-bg)]">
            <tr>{COLUMNS.map((column) => <th key={column} className="whitespace-nowrap border-b border-r border-[var(--color-border)] px-2 py-2 text-left">{column}</th>)}<th className="w-12 border-b border-[var(--color-border)]" /></tr>
          </thead>
          <tbody>
            {normalized.map((row, r) => (
              <tr key={r}>
                {COLUMNS.map((_, c) => (
                  <td key={c} className="border-b border-r border-[var(--color-border)] p-0">
                    <input value={row[c] ?? ""} onChange={(e) => updateCell(r, c, e.target.value)} onPaste={(e) => { if (e.clipboardData.getData("text").includes("\t") || e.clipboardData.getData("text").includes("\n")) { e.preventDefault(); pasteAt(r, c, e.clipboardData.getData("text")); } }} className="w-full min-w-[80px] bg-transparent px-2 py-2 outline-none focus:bg-[var(--color-bg)]" />
                  </td>
                ))}
                <td className="border-b border-[var(--color-border)] px-1"><button onClick={() => removeRow(r)} className="text-[var(--color-ink-soft)]">削除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={addRow} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm">＋ 行を追加</button>
        {message && <span className="text-xs text-[var(--color-ink-soft)]">{message}</span>}
      </div>
    </section>
  );
}
