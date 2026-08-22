"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { studentLoginAction } from "./actions";

function StudentLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/my";
  const [state, formAction, isPending] = useActionState(
    studentLoginAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="text"
        name="loginId"
        placeholder="生徒ID"
        autoFocus
        className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      <input
        type="password"
        name="password"
        placeholder="パスワード"
        className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      {state?.error && (
        <p className="text-sm" style={{ color: "var(--color-absent)" }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: "var(--color-accent)" }}
      >
        ログイン
      </button>
    </form>
  );
}

export default function StudentLoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4">
      <h1 className="text-lg font-semibold">生徒ログイン</h1>
      <Suspense fallback={null}>
        <StudentLoginForm />
      </Suspense>
      <p className="text-xs text-[var(--color-ink-soft)]">
        IDとパスワードは教室から発行されたものを使ってください。
      </p>
    </div>
  );
}
