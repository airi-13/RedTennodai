"use client";

import { useMemo, useState } from "react";

// 生徒ID・PassのみDB上必須。それ以外は空欄でも登録できる。
const COLUMNS = ["生徒ID", "性", "姓", "名", "ｾｲ", "ﾒｲ", "学校", "学年", "生年月日", "Pass", "授業科目", "授業数", "授業コマ", "備考"];
const PASS_COL = 9;

export type StudentStatus = "active" | "inactive";

type Props = {
  // 既存生徒(prefilled)。新規追加用の空行は内部で自動的に用意する。
  initialRows: string[][];
  initialRowIds: number[]; // initialRowsと同じ順番・同じ長さ(既存生徒のID)
  initialStatuses: StudentStatus[]; // 同上、退塾/在籍中の状態
  // 生徒ID・Pass以外のセル編集をまとめて保存する。rowIds[i]がnullの行は新規作成。
  onSave: (rows: string[][], rowIds: (number | null)[]) => Promise<void>;
  // 退塾/復帰・削除は表内から即時に反映する(保存ボタンを待たない)。
  onToggleActive: (studentId: number) => Promise<void>;
  onDelete: (studentId: number) => Promise<void>;
};

const NEW_ROW_COUNT = 5;

function emptyRow() {
  return Array(COLUMNS.length).fill("");
}

function parseClipboard(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.length > 0).map((line) => line.split("\t"));
}

export function SpreadsheetStudentEditor({ initialRows, initialRowIds, initialStatuses, onSave, onToggleActive, onDelete }: Props) {
  const [rows, setRows] = useState<string[][]>([...initialRows, ...Array.from({ length: NEW_ROW_COUNT }, emptyRow)]);
  const [rowIds, setRowIds] = useState<(number | null)[]>([...initialRowIds, ...Array(NEW_ROW_COUNT).fill(null)]);
  const [statuses, setStatuses] = useState<Record<number, StudentStatus>>(
    Object.fromEntries(initialRowIds.map((id, i) => [id, initialStatuses[i]]))
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const normalized = useMemo(
    () => rows.map((row) => [...row, ...Array(Math.max(0, COLUMNS.length - row.length)).fill("")].slice(0, COLUMNS.length)),
    [rows]
  );

  function updateCell(r: number, c: number, value: string) {
    setRows((current) => current.map((row, ri) => (ri === r ? Object.assign([...row, ...Array(COLUMNS.length - row.length).fill("")], { [c]: value }) : row)));
    setMessage(null);
  }

  function pasteAt(r: number, c: number, text: string) {
    const pasted = parseClipboard(text);
    setRows((current) => {
      const next = current.map((row) => [...row]);
      pasted.forEach((line, rr) => {
        const target = r + rr;
        while (next.length <= target) next.push(emptyRow());
        line.forEach((value, cc) => {
          if (c + cc < COLUMNS.length) next[target][c + cc] = value;
        });
      });
      return next;
    });
    setRowIds((current) => {
      const next = [...current];
      pasted.forEach((_, rr) => {
        while (next.length <= r + rr) next.push(null);
      });
      return next;
    });
    setMessage(`${pasted.length}行を貼り付けました`);
  }

  function addRow() {
    setRows((current) => [...current, emptyRow()]);
    setRowIds((current) => [...current, null]);
  }
  function removeNewRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setRowIds((current) => current.filter((_, i) => i !== index));
  }

  async function toggleActive(studentId: number) {
    setPendingIds((prev) => new Set(prev).add(studentId));
    try {
      await onToggleActive(studentId);
      setStatuses((prev) => ({ ...prev, [studentId]: prev[studentId] === "active" ? "inactive" : "active" }));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  }

  async function remove(studentId: number, index: number) {
    setPendingIds((prev) => new Set(prev).add(studentId));
    try {
      await onDelete(studentId);
      setRows((current) => current.filter((_, i) => i !== index));
      setRowIds((current) => current.filter((_, i) => i !== index));
      setConfirmingDeleteId(null);
    } catch (e: any) {
      setMessage(e?.message ?? "削除に失敗しました");
      setConfirmingDeleteId(null);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  }

  async function save() {
    const pairs = normalized
      .map((row, i) => ({ row, id: rowIds[i] ?? null }))
      .filter(({ row, id }) => id != null || row.some((v) => v.trim()));
    const data = pairs.map((p) => p.row);
    const ids = pairs.map((p) => p.id);

    const invalidNew = pairs.findIndex(({ row, id }) => id == null && (!row[0].trim() || !row[PASS_COL].trim()));
    if (invalidNew >= 0) {
      setMessage(`${invalidNew + 1}行目：新規登録には生徒IDとPassが必須です`);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await onSave(data, ids);
      setMessage("保存しました");
    } catch (e: any) {
      setMessage(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">生徒一覧</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            この表から追加・編集ができます。生徒IDは登録後は変更できません。Pass欄は空欄のままにすると変更されません(新規登録の行は必須)。
            授業科目・授業コマの両方が空欄の行は、現在のスケジュールを維持します。生徒ID・Pass以外は未入力でも登録できます。
            退塾・削除は各行のボタンから即時に反映されます(保存ボタンは不要)。
          </p>
        </div>
        <button onClick={save} disabled={saving} className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
          保存
        </button>
      </div>
      <div className="overflow-auto rounded-md border border-[var(--color-border)]">
        <table className="min-w-[1400px] border-collapse text-xs">
          <thead className="sticky top-0 bg-[var(--color-bg)]">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="whitespace-nowrap border-b border-r border-[var(--color-border)] px-2 py-2 text-left">
                  {column}
                </th>
              ))}
              <th className="w-40 border-b border-[var(--color-border)]" />
            </tr>
          </thead>
          <tbody>
            {normalized.map((row, r) => {
              const studentId = rowIds[r];
              const isExisting = studentId != null;
              const status = isExisting ? statuses[studentId] : undefined;
              const isPending = isExisting && pendingIds.has(studentId);
              return (
                <tr key={studentId ?? `new-${r}`} className={status === "inactive" ? "opacity-60" : undefined}>
                  {COLUMNS.map((_, c) => (
                    <td key={c} className="border-b border-r border-[var(--color-border)] p-0">
                      <input
                        value={row[c] ?? ""}
                        onChange={(e) => updateCell(r, c, e.target.value)}
                        placeholder={c === PASS_COL && isExisting ? "変更なし" : undefined}
                        readOnly={isExisting && c === 0}
                        onPaste={(e) => {
                          if (e.clipboardData.getData("text").includes("\t") || e.clipboardData.getData("text").includes("\n")) {
                            e.preventDefault();
                            pasteAt(r, c, e.clipboardData.getData("text"));
                          }
                        }}
                        className="w-full min-w-[80px] bg-transparent px-2 py-2 outline-none focus:bg-[var(--color-bg)] read-only:text-[var(--color-ink-soft)]"
                      />
                    </td>
                  ))}
                  <td className="border-b border-[var(--color-border)] px-1">
                    {isExisting ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-[var(--color-ink-soft)]">{status === "active" ? "在籍中" : "退塾済み"}</span>
                        <button disabled={isPending} onClick={() => toggleActive(studentId)} className="text-[10px] underline disabled:opacity-50">
                          {status === "active" ? "退塾にする" : "復帰させる"}
                        </button>
                        {confirmingDeleteId === studentId ? (
                          <span className="flex items-center gap-1">
                            <button disabled={isPending} onClick={() => remove(studentId, r)} className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white disabled:opacity-50" style={{ background: "var(--color-absent)" }}>
                              削除する
                            </button>
                            <button disabled={isPending} onClick={() => setConfirmingDeleteId(null)} className="text-[10px] underline">
                              やめる
                            </button>
                          </span>
                        ) : (
                          <button disabled={isPending} onClick={() => setConfirmingDeleteId(studentId)} className="text-[10px] underline disabled:opacity-50" style={{ color: "var(--color-absent)" }}>
                            削除
                          </button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => removeNewRow(r)} className="text-[10px] text-[var(--color-ink-soft)] underline">
                        この行を削除
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
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
