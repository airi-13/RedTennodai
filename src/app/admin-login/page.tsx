"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { adminLoginAction } from "./actions";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/attendance";
  const [state, formAction, isPending] = useActionState(adminLoginAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        placeholder="パスワード"
        autoFocus
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

export default function AdminLoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4">
      <h1 className="text-lg font-semibold">管理者ログイン</h1>
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
