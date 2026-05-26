import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// 速率限制器
// - 生产环境（Vercel）：使用 Supabase RPC，跨实例共享状态
// - 本地开发：使用内存 Map，无需数据库
// ============================================================

const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

// 内存限流（仅本地开发用）
const hits = new Map<string, { count: number; resetAt: number }>();

if (!isProduction) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (val.resetAt < now) hits.delete(key);
    }
  }, 60_000);
}

/**
 * 速率限制检查
 * @param key      唯一标识（如 user_id）
 * @param limit    窗口内最大请求数
 * @param windowMs 时间窗口（毫秒）
 * @returns true = 允许，false = 被限流
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (isProduction) {
    return checkRateLimitSupabase(key, limit, windowMs);
  }
  return checkRateLimitMemory(key, limit, windowMs);
}

// Supabase RPC 实现（生产环境）
async function checkRateLimitSupabase(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window: Math.ceil(windowMs / 1000),
    });

    if (error) {
      // RPC 失败时放行，避免限流系统本身导致故障
      console.error("[rate-limit] Supabase RPC error:", error.message);
      return true;
    }

    return data === true;
  } catch (err) {
    console.error("[rate-limit] unexpected error:", err);
    return true;
  }
}

// 内存实现（本地开发）
function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = hits.get(key);

  if (!record || record.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}
