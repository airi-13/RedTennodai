"use client";

import { useMemo, useState } from "react";

const COLUMNS = ["生徒ID", "性", "姓", "名", "ｾｲ", "ﾒｲ", "学校", "学年", "Pass", "授業科目", "授業数", "授業コマ"];

type Props = {
  // 編集モードでは、行データと一緒に生徒ID(rowIds)を必ず受け取れる。
  // 行の削除・空行があってもズレて別人として保存されないよう、位置ではなくIDで対応付けるため。
  onRegister?: (rows: string[][], rowIds: (number | null)[]) => Promise<void>;
  mode?: "create" | "edit";
  initialRows?: string[][];
  // initialRows と同じ順番・同じ長さで、各行がどの生徒かを表すID(新規行はnull)。
  initialRowIds?: (number | null)[];
};

function parseClipboard(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.length > 0).map((line) => line.split("\t"));
}

export function SpreadsheetStudentEditor({ onRegister, mode = "create", initialRows, initialRowIds }: Props) {
  const [rows, setRows] = useState<string[][]>(initialRows?.length ? initialRows : [Array(COLUMNS.length).fill("")]);
  const [rowIds, setRowIds] = useState<(number | null)[]>(
    initialRowIds?.length ? initialRowIds : rows.map(() => null)
  );
  const [message, setMessage] = useState<string | null>(null);

  const normalized = useMemo(() => rows.map((row) => [...row, ...Array(Math.max(0, COLUMNS.length - row.length)).fill("")].slice(0, COLUMNS.length)), [rows]);

  function updateCell(r: number, c: number, value: string) {
    setRows((current) => current.map((row, ri) => ri === r ? Object.assign([...row, ...Array(COLUMNS.length - row.length).fill("")], { [c]: value }) : row));
    setMessage(null);
  }

  // 貼り付けは新規登録モード専用(編集モードは既存生徒への行の対応付けがズレるため使わない)
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
    setRowIds((current) => {
      const next = [...current];
      pasted.forEach((_, rr) => { while (next.length <= r + rr) next.push(null); });
      return next;
    });
    setMessage(`${pasted.length}行を貼り付けました`);
  }

  function addRow() {
    setRows((current) => [...current, []]);
    setRowIds((current) => [...current, null]);
  }
  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setRowIds((current) => current.filter((_, i) => i !== index));
  }

  async function register() {
    // 行データとIDを必ずペアのまま扱う。空行を除外してもズレないようにするため。
    const pairs = normalized
      .map((row, i) => ({ row, id: rowIds[i] ?? null }))
      .filter(({ row }) => row.some((v) => v.trim()));
    const data = pairs.map((p) => p.row);
    const ids = pairs.map((p) => p.id);

    if (!data.length) return setMessage(mode === "edit" ? "保存する行がありません" : "登録するデータがありません");
    const invalid = data.findIndex((row) => !row[0].trim() || !row[3].trim() || (mode === "create" && !row[8].trim()));
    if (invalid >= 0) {
      return setMessage(
        mode === "edit"
          ? `${invalid + 1}行目：生徒ID・名は必須です`
          : `${invalid + 1}行目：生徒ID・名・Passは必須です`
      );
    }
    if (mode === "edit" && ids.some((id) => id == null)) {
      return setMessage("対象の生徒が特定できない行があります(ページを再読み込みしてやり直してください)");
    }
    if (onRegister) {
      try {
        await onRegister(data, ids);
        setMessage(mode === "edit" ? `${data.length}件を保存しました` : `${data.length}件を登録しました`);
      } catch {
        // 詳細なエラーメッセージは呼び出し元(BulkImport/StudentsView側)が表示するため、ここでは上書きしない
        setMessage(null);
      }
      return;
    }
    setMessage(mode === "edit" ? `${data.length}件を保存しました` : `${data.length}件を登録しました`);
  }

  const passLabel = mode === "edit" ? "Pass(変更する場合のみ)" : "Pass";

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{mode === "edit" ? "生徒一覧を表で編集" : "生徒を表で入力"}</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            {mode === "edit"
              ? "各セルを直接編集し、保存を押すと反映されます。Pass欄は空欄のままにすると変更されません。授業科目・授業コマの両方が空欄の行は、現在のスケジュールを維持します。行の追加・削除はここではできません(生徒の削除は下の一覧の「編集」から行ってください)。"
              : "Excel / Googleスプレッドシートから範囲をコピーして、左上セルへ貼り付けできます。"}
          </p>
        </div>
        <button onClick={register} className="rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: "var(--color-accent)" }}>
          {mode === "edit" ? "保存" : "登録"}
        </button>
      </div>
      <div className="overflow-auto rounded-md border border-[var(--color-border)]">
        <table className="min-w-[1200px] border-collapse text-xs">
          <thead className="sticky top-0 bg-[var(--color-bg)]">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="whitespace-nowrap border-b border-r border-[var(--color-border)] px-2 py-2 text-left">
                  {column === "Pass" ? passLabel : column}
                </th>
              ))}
              {mode === "create" && <th className="w-12 border-b border-[var(--color-border)]" />}
            </tr>
          </thead>
          <tbody>
            {normalized.map((row, r) => (
              <tr key={rowIds[r] ?? `new-${r}`}>
                {COLUMNS.map((_, c) => (
                  <td key={c} className="border-b border-r border-[var(--color-border)] p-0">
                    <input
                      value={row[c] ?? ""}
                      onChange={(e) => updateCell(r, c, e.target.value)}
                      placeholder={c === 8 && mode === "edit" ? "変更なし" : undefined}
                      readOnly={mode === "edit" && c === 0}
                      onPaste={(e) => {
                        if (mode !== "create") return;
                        if (e.clipboardData.getData("text").includes("\t") || e.clipboardData.getData("text").includes("\n")) {
                          e.preventDefault();
                          pasteAt(r, c, e.clipboardData.getData("text"));
                        }
                      }}
                      className="w-full min-w-[80px] bg-transparent px-2 py-2 outline-none focus:bg-[var(--color-bg)] read-only:text-[var(--color-ink-soft)]"
                    />
                  </td>
                ))}
                {mode === "create" && (
                  <td className="border-b border-[var(--color-border)] px-1">
                    <button onClick={() => removeRow(r)} className="text-[var(--color-ink-soft)]">削除</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {mode === "create" && (
          <button onClick={addRow} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm">＋ 行を追加</button>
        )}
        {message && <span className="text-xs text-[var(--color-ink-soft)]">{message}</span>}
      </div>
    </section>
  );
}
