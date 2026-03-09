"use server";

import { createClient } from "@/lib/supabase/server";

export type VocabItem = {
  id: number;
  korean_word: string;
  hanja: string;
  context_sentence: string | null;
  source_url: string | null;
  source_title: string | null;
  is_memorized: boolean;
  saved_at: string;
};

// 단어장 목록 조회
export async function getVocabulary(): Promise<{
  data: VocabItem[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: "로그인이 필요합니다" };
  }

  const { data, error } = await supabase
    .from("user_vocabulary")
    .select(
      "id, korean_word, hanja, context_sentence, source_url, source_title, is_memorized, saved_at"
    )
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [] };
}

// "외웠어요" 토글
export async function toggleMemorized(
  vocabId: number,
  isMemorized: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("user_vocabulary")
    .update({ is_memorized: isMemorized })
    .eq("id", vocabId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

// 단어 삭제
export async function deleteVocab(
  vocabId: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("user_vocabulary")
    .delete()
    .eq("id", vocabId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

// 프로필 업데이트 (닉네임, 급수, 전화번호만 허용)
const ALLOWED_PROFILE_FIELDS = ["nickname", "current_level", "phone"] as const;
type ProfileUpdates = Partial<Record<typeof ALLOWED_PROFILE_FIELDS[number], string | number>>;

export async function updateProfile(
  updates: { nickname?: string; current_level?: number; phone?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  // 허용된 필드만 필터링
  const safeUpdates: ProfileUpdates = {};
  for (const key of ALLOWED_PROFILE_FIELDS) {
    if (key in updates && updates[key] !== undefined) {
      safeUpdates[key] = updates[key];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { error: "변경할 항목이 없습니다" };
  }

  const { error } = await supabase
    .from("profiles")
    .update(safeUpdates)
    .eq("id", user.id);

  if (error) return { error: error.message };
  return {};
}
