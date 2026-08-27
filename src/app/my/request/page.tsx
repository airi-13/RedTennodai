import Link from "next/link";
import Link from "next/link";

export const dynamic = "force-dynamic";

// 欠席・振替の登録は、カレンダー上で該当授業をタップして行う方式に統一した
// (対象コマの取り違えを防ぎ、開始5分前の締切判定も正しく行うため)。
export default function MyRequestPage() {
  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-lg font-semibold">欠席・振替の登録</h1>
      <p className="text-sm text-[var(--color-ink-soft)]">
        欠席・振替の登録は、カレンダー上で該当する授業をタップして行ってください。
      </p>
      <Link
        href="/my"
        className="inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ background: "var(--color-accent)" }}
      >
        カレンダーを開く
      </Link>
    </div>
  );
}
    </div>
  );
}
