import { supabase } from "@/lib/supabase";
import { loginIdToDummyEmail } from "@/lib/student-login";
import { findOrCreateSchoolByName } from "@/lib/data/schools";
import type { Student } from "@/lib/types";

export async function getStudents(includeInactive = false): Promise<Student[]> {
  let query = supabase.from("students").select("*").order("name");
  if (!includeInactive) {
    query = query.eq("status", "active");
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getStudent(id: number): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NewStudent = {
  name: string;
  name_kana?: string | null;
  gender?: string | null;
  school_level?: string | null;
  school_name?: string | null;
  grade?: number | null;
  enrolled_on?: string | null;
  note?: string | null;
};

export async function createStudent(input: NewStudent): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 生徒の登録と同時にSupabase Authのログインアカウントも発行する。
// login_idは生徒が入力する短いID、passwordは管理者が決めて生徒に伝える。
export async function createStudentWithLogin(
  input: NewStudent & { loginId: string; password: string }
): Promise<Student> {
  const { loginId, password, ...studentInput } = input;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: loginIdToDummyEmail(loginId),
    password,
    email_confirm: true,
  });
  if (authError) throw authError;

  const school_id = studentInput.school_name
    ? (await findOrCreateSchoolByName(studentInput.school_name)).id
    : null;

  const { data, error } = await supabase
    .from("students")
    .insert({
      ...studentInput,
      school_id,
      login_id: loginId,
      auth_user_id: authData.user.id,
    })
    .select()
    .single();
  if (error) {
    // 生徒行の作成に失敗した場合、孤立したAuthユーザーを残さないよう削除しておく
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw error;
  }
  return data;
}

export async function updateStudentStatus(
  id: number,
  status: "active" | "inactive"
) {
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
