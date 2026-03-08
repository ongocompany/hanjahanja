import { createClient } from "@supabase/supabase-js";

// service_role 키로 admin 권한 클라이언트 생성 (서버 사이드 전용)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
