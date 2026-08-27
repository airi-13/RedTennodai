"use client";

import { useMemo, useState, useTransition } from "react";
import type { Textbook, TextbookLevel, TextbookSubject } from "@/lib/data/textbooks.shared";
import { getTextbookGradeLabel, getTextbookSubjectLabel, TEXTBOOK_ALL_GRADES, TEXTBOOK_GRADES, TEXTBOOK_LEVELS, TEXTBOOK_SUBJECTS } from "@/lib/data/textbooks.shared";
import type { PricingRule } from "@/lib/data/pricing";
import { createTextbookAction, deleteTextbookAction, upsertPricingRuleAction } from "./actions";

export function MaterialsView({ textbooks, pricingRules }: { textbooks: Textbook[]; pricingRules: PricingRule[] }) {
  return (
    <div className="space-y-10">
      <h1 className="text-lg font-semibold">教材・料金設定</h1>
      <TextbookSection textbooks={textbooks} />
      <PricingSection pricingRules={pricingRules} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs text-[var(--color-ink-soft)]">{label}{children}</label>;
}

function TextbookSection({ textbooks }: { textbooks: Textbook[] }) {
  const [isPending, startTransition] = useTransition();
  const [level, setLevel] = useState<TextbookLevel>("小学生");
  const [subjects, setSubjects] = useState<TextbookSubject[]>(["英語"]);
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [gradeLabel, setGradeLabel] = useState(TEXTBOOK_GRADES.小学生[0]);
  const [description, setDescription] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  const availableGrades = [TEXTBOOK_ALL_GRADES, ...TEXTBOOK_GRADES[level]];

  // 絞り込み候補は、現在の選択条件で実際に存在する教材だけを候補にする。
  const filterLevelOptions = useMemo(() =>
    TEXTBOOK_LEVELS.filter((l) => textbooks.some((t) => t.level === l)),
    [textbooks]
  );

  const filterSubjectOptions = useMemo(() => {
    const candidates = textbooks.filter((t) => !filterLevel || t.level === filterLevel);
    return TEXTBOOK_SUBJECTS.filter((s) => candidates.some((t) => t.subjects.includes(s)));
  }, [textbooks, filterLevel]);

  const filterGradeOptions = useMemo(() => {
    const candidates = textbooks.filter((t) =>
      (!filterLevel || t.level === filterLevel) &&
      (!filterSubject || t.subjects.includes(filterSubject as TextbookSubject))
    );
    const grades = new Set<string>();
    for (const textbook of candidates) grades.add(textbook.grade_label);
    return [TEXTBOOK_ALL_GRADES, ...Array.from(grades).filter((g) => g !== TEXTBOOK_ALL_GRADES)];
  }, [textbooks, filterLevel, filterSubject]);

  const filteredTextbooks = useMemo(() => textbooks.filter((t) =>
    (!filterLevel || t.level === filterLevel) &&
    (!filterSubject || t.subjects.includes(filterSubject as TextbookSubject)) &&
    (!filterGrade || t.grade_label === TEXTBOOK_ALL_GRADES || t.grade_label === filterGrade)
  ), [textbooks, filterLevel, filterSubject, filterGrade]);

  const changeLevel = (value: TextbookLevel) => {
    setLevel(value);
    setGradeLabel(TEXTBOOK_GRADES[value][0]);
  };

  const changeFilterLevel = (value: string) => {
    setFilterLevel(value);
    setFilterSubject("");
    setFilterGrade("");
  };

  const changeFilterSubject = (value: string) => {
    setFilterSubject(value);
    setFilterGrade("");
  };

  const toggleSubject = (subject: TextbookSubject) => {
    setSubjects((current) => current.includes(subject)
      ? current.filter((s) => s !== subject)
      : [...current, subject]);
  };

  const add = () => startTransition(async () => {
    await createTextbookAction({ level, subjects, title, publisher: publisher || undefined, grade_label: gradeLabel, description: description || undefined });
    setTitle(""); setPublisher(""); setDescription("");
  });

  return (
    <section className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="font-medium">使用テキスト</h2>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="区分">
          <select value={level} onChange={(e) => changeLevel(e.target.value as TextbookLevel)} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
            {TEXTBOOK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="学年">
          <select value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
            {availableGrades.map((g) => <option key={g} value={g}>{getTextbookGradeLabel(level, g)}</option>)}
          </select>
        </Field>
        <Field label="科目（複数選択可）">
          <div className="flex flex-wrap gap-1 rounded-md border border-[var(--color-border)] p-1">
            {TEXTBOOK_SUBJECTS.map((s) => (
              <button key={s} type="button" onClick={() => toggleSubject(s)} className={`rounded px-2 py-1 text-xs ${subjects.includes(s) ? "font-semibold" : "opacity-60"}`} aria-pressed={subjects.includes(s)}>
                {getTextbookSubjectLabel(level, s)}
              </button>
            ))}
          </div>
        </Field>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="テキスト名" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="出版社(任意)" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="補足(任意)" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <button disabled={isPending || !title || subjects.length === 0} onClick={add} className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--color-accent)" }}>追加</button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
        <Field label="区分で絞り込み">
          <select value={filterLevel} onChange={(e) => changeFilterLevel(e.target.value)} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
            <option value="">すべて</option>{filterLevelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="科目で絞り込み">
          <select value={filterSubject} onChange={(e) => changeFilterSubject(e.target.value)} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
            <option value="">すべて</option>{filterSubjectOptions.map((s) => <option key={s} value={s}>{getTextbookSubjectLabel((filterLevel || "中学生") as TextbookLevel, s)}</option>)}
          </select>
        </Field>
        <Field label="学年で絞り込み">
          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm">
            <option value="">すべて</option>{filterGradeOptions.map((g) => <option key={g} value={g}>{filterLevel ? getTextbookGradeLabel(filterLevel as TextbookLevel, g) : g}</option>)}
          </select>
        </Field>
        {(filterLevel || filterSubject || filterGrade) && <button onClick={() => { setFilterLevel(""); setFilterSubject(""); setFilterGrade(""); }} className="text-xs text-[var(--color-ink-soft)] underline">絞り込みを解除</button>}
      </div>

      <ul className="space-y-1 text-sm">
        {[...filteredTextbooks].sort((a, b) => `${a.level}${a.grade_label}${a.title}`.localeCompare(`${b.level}${b.grade_label}${b.title}`, "ja")).map((t) => (
          <li key={t.id} className="flex items-center justify-between">
            <span>[{t.level}][{getTextbookGradeLabel(t.level, t.grade_label)}][{t.subjects.map((s) => getTextbookSubjectLabel(t.level, s)).join("・")}] {t.title}{t.publisher && ` / ${t.publisher}`}</span>
            <button disabled={isPending} onClick={() => startTransition(() => deleteTextbookAction(t.id))} className="text-xs text-[var(--color-ink-soft)] underline">削除</button>
          </li>
        ))}
        {textbooks.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">まだ登録がありません</p>}
        {textbooks.length > 0 && filteredTextbooks.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">該当するテキストがありません</p>}
      </ul>
    </section>
  );
}

function PricingSection({ pricingRules }: { pricingRules: PricingRule[] }) {
  const [isPending, startTransition] = useTransition();
  const [gradeLabel, setGradeLabel] = useState("");
  const [price, setPrice] = useState("");
  return (
    <section className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="font-medium">学年別 1コマあたり料金</h2>
      <p className="text-xs text-[var(--color-ink-soft)]">学年表記(例: 小1, 中3, 高2)は生徒データの学年表示と揃えてください。同じ学年で再登録すると上書きされます。</p>
      <div className="flex flex-wrap items-end gap-2">
        <input value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="学年(例: 小5)" className="w-28 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1コマあたり(円)" className="w-32 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <button disabled={isPending || !gradeLabel || !price} onClick={() => startTransition(async () => { await upsertPricingRuleAction({ grade_label: gradeLabel, price_per_slot: Number(price) }); setGradeLabel(""); setPrice(""); })} className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--color-accent)" }}>保存</button>
      </div>
      <ul className="space-y-1 text-sm">{pricingRules.map((r) => <li key={r.grade_label}>{r.grade_label}: {r.price_per_slot.toLocaleString()}円 / コマ</li>)}{pricingRules.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">まだ登録がありません</p>}</ul>
    </section>
  );
}
