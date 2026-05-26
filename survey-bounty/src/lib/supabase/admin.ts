import { createClient } from "@supabase/supabase-js";

/**
 * 无 cookie 的 Supabase 客户端，用于服务端操作（如速率限制）
 * 不需要用户登录态，不走 SSR cookies 流程
 *
 * 如需更高权限（绕过 RLS），设置 SUPABASE_SERVICE_ROLE_KEY 环境变量
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, key);
}
