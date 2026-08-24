// スプレッドシートからコピーした行(タブ区切り)を生徒登録用データに変換する。
// 列の並び: 生徒ID, 性, 姓, 名, セイ, メイ, 学校, 学年(例:高2/中3/小6), Pass

export type ParsedStudentRow = {
  raw: string;
  lineNumber: number;
  ok: boolean;
  error?: string;
  data?: {
    loginId: string;
    gender: string | null;
    name: string;
    nameKana: string | null;
    schoolName: string | null;
    schoolLevel: string;
    grade: number;
    password: string;
  };
};

const GRADE_PREFIX: Record<string, string> = { 小: "小学生", 中: "中学生", 高: "高校生" };

function parseGrade(text: string): { schoolLevel: string; grade: number } | null {
  const m = text.trim().match(/^(小|中|高)(\d+)$/);
  if (!m) return null;
  const schoolLevel = GRADE_PREFIX[m[1]];
  const grade = Number(m[2]);
  if (!schoolLevel || !grade) return null;
  return { schoolLevel, grade };
}

export function parsePastedStudents(text: string): ParsedStudentRow[] {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);

  return lines.map((line, i) => {
    const cols = line.split("\t").map((c) => c.trim());
    const [loginId, gender, sei, mei, seiKana, meiKana, schoolName, gradeText, password] = cols;

    if (!loginId || !sei || !mei || !gradeText || !password) {
      return {
        raw: line,
        lineNumber: i + 1,
        ok: false,
        error: "生徒ID・姓・名・学年・Passのいずれかが空です",
      };
    }

    const gradeParsed = parseGrade(gradeText);
    if (!gradeParsed) {
      return {
        raw: line,
        lineNumber: i + 1,
        ok: false,
        error: `学年の形式が不正です("${gradeText}"。例: 高2, 中3, 小6)`,
      };
    }

    const nameKana = [seiKana, meiKana].filter(Boolean).join(" ") || null;

    return {
      raw: line,
      lineNumber: i + 1,
      ok: true,
      data: {
        loginId,
        gender: gender || null,
        name: `${sei} ${mei}`,
        nameKana,
        schoolName: schoolName || null,
        schoolLevel: gradeParsed.schoolLevel,
        grade: gradeParsed.grade,
        password,
      },
    };
  });
}
