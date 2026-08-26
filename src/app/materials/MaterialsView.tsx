"use client";

import { useMemo, useState, useTransition } from "react";
import type { Textbook } from "@/lib/data/textbooks";
import type { PricingRule } from "@/lib/data/pricing";
import { createTextbookAction, deleteTextbookAction, upsertPricingRuleAction } from "./actions";

export function MaterialsView({
  textbooks,
  pricingRules,
}: {
  textbooks: Textbook[];
  pricingRules: PricingRule[];
}) {
  return (
    <div className="space-y-10">
      <h1 className="text-lg font-semibold">教材・料金設定</h1>
      <TextbookSection textbooks={textbooks} />
      <PricingSection pricingRules={pricingRules} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--color-ink-soft)]">
      {label}
      {children}
    </label>
  );
}

// 絞り込みの選択肢は固定(データから動的に出さない)
const LEVELS = ["小学生", "中学生", "高校生"];
const SUBJECTS = ["英語", "数学", "理科", "社会", "国語"];
const GRADES = ["１年", "２年", "３年", "４年", "５年", "６年"];

function TextbookSection({ textbooks }: { textbooks: Textbook[] }) {
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [description, setDescription] = useState("");

  // 絞り込み条件(区分[小学生/中学生/高校生]・科目・学年)
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  // grade_labelが未設定(学年という概念のないテキスト、例: 高校のコース別テキストや
  // 中学の地理・歴史・公民、旧「全学年」相当)は、どの学年を選んでも常に表示する。
  const filteredTextbooks = useMemo(() => {
    return textbooks.filter(
      (t) =>
        (!filterLevel || t.description === filterLevel) &&
        (!filterSubject || t.subject === filterSubject) &&
        (!filterGrade || !t.grade_label || t.grade_label === filterGrade)
    );
  }, [textbooks, filterLevel, filterSubject, filterGrade]);

  return (
    <section className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="font-medium">使用テキスト</h2>
      <div className="flex flex-wrap items-end gap-2">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="科目" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="テキスト名" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="出版社(任意)" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="対象学年(任意)" className="w-28 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="補足(任意)" className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <button
          disabled={isPending || !subject || !title}
          onClick={() =>
            startTransition(async () => {
              await createTextbookAction({
                subject,
                title,
                publisher: publisher || undefined,
                grade_label: gradeLabel || undefined,
                description: description || undefined,
              });
              setSubject(""); setTitle(""); setPublisher(""); setGradeLabel(""); setDescription("");
            })
          }
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          追加
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
        <Field label="区分で絞り込み">
          <select
            value={filterLevel}
            onChange={(e) => {
              setFilterLevel(e.target.value);
              setFilterSubject("");
              setFilterGrade("");
            }}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            <option value="">すべて</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="科目で絞り込み">
          <select
            value={filterSubject}
            onChange={(e) => {
              setFilterSubject(e.target.value);
              setFilterGrade("");
            }}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            <option value="">すべて</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="学年で絞り込み">
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            <option value="">すべて</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        {(filterLevel || filterSubject || filterGrade) && (
          <button
            onClick={() => {
              setFilterLevel("");
              setFilterSubject("");
              setFilterGrade("");
            }}
            className="text-xs text-[var(--color-ink-soft)] underline"
          >
            絞り込みを解除
          </button>
        )}
      </div>
      <ul className="space-y-1 text-sm">
        {[...filteredTextbooks]
          .sort((a, b) => {
            const ai = LEVELS.indexOf(a.description ?? "");
            const bi = LEVELS.indexOf(b.description ?? "");
            if (ai !== bi) return ai - bi;
            if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, "ja");
            return a.title.localeCompare(b.title, "ja");
          })
          .map((t) => (
            <li key={t.id} className="flex items-center justify-between">
              <span>
                {t.description && <span className="mr-1 text-xs text-[var(--color-ink-soft)]">[{t.description}]</span>}
                [{t.subject}] {t.title} {t.grade_label && `(${t.grade_label})`}
                {t.publisher && ` / ${t.publisher}`}
              </span>
              <button
                disabled={isPending}
                onClick={() => startTransition(() => deleteTextbookAction(t.id))}
                className="text-xs text-[var(--color-ink-soft)] underline"
              >
                削除
              </button>
            </li>
          ))}
        {textbooks.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">まだ登録がありません</p>
        )}
        {textbooks.length > 0 && filteredTextbooks.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">該当するテキストがありません</p>
        )}
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
      <p className="text-xs text-[var(--color-ink-soft)]">
        学年表記(例: 小1, 中3, 高2)は生徒データの学年表示と揃えてください。同じ学年で再登録すると上書きされます。
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <input value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="学年(例: 小5)" className="w-28 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm" />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="1コマあたり(円)"
          className="w-32 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
        <button
          disabled={isPending || !gradeLabel || !price}
          onClick={() =>
            startTransition(async () => {
              await upsertPricingRuleAction({ grade_label: gradeLabel, price_per_slot: Number(price) });
              setGradeLabel(""); setPrice("");
            })
          }
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          保存
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {pricingRules.map((r) => (
          <li key={r.grade_label}>
            {r.grade_label}: {r.price_per_slot.toLocaleString()}円 / コマ
          </li>
        ))}
        {pricingRules.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">まだ登録がありません</p>
        )}
      </ul>
    </section>
  );
}
