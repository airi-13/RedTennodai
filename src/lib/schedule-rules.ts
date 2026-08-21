// DBクライアントに依存しない純粋なビジネスルール。
// クライアントコンポーネントからも安全にimportできるよう data/ 配下とは分離している。

// 80分授業(連続コマ)として正しい組み合わせか判定する。
// sort_orderが奇数から始まり、直後の偶数と対になっている場合のみtrue。
// 例: (1,2)(3,4)(5,6)(7,8)はOK、(2,3)や(1,3)はNG。
// 呼び出し側(管理者操作)では、falseでも警告表示のみに留め登録自体は妨げない運用。
export function isValidEightyMinutePair(
  sortOrderA: number,
  sortOrderB: number
): boolean {
  const lo = Math.min(sortOrderA, sortOrderB);
  const hi = Math.max(sortOrderA, sortOrderB);
  return lo % 2 === 1 && hi === lo + 1;
}
