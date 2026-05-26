-- ============================================================
-- 速率限制表 + RPC
-- 替代内存 Map，适配 Vercel Serverless 多实例部署
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 禁用 RLS（此表不存敏感数据，服务端直接操作）
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- 清理过期记录的函数（可由 cron 或手动调用）
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- 速率限制检查 + 自增 RPC（原子操作）
-- @param p_key      限流 key（如 "create:user-id"）
-- @param p_limit    窗口内最大请求数
-- @param p_window   时间窗口（秒）
-- @returns true = 允许，false = 被限流
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
BEGIN
  -- 尝试获取现有记录
  SELECT count, window_start INTO v_record
  FROM public.rate_limits
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- 新 key，插入
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now);
    RETURN TRUE;
  END IF;

  -- 检查窗口是否过期
  v_window_start := v_record.window_start;
  IF v_window_start + (p_window || ' seconds')::interval < v_now THEN
    -- 窗口过期，重置
    UPDATE public.rate_limits
    SET count = 1, window_start = v_now
    WHERE key = p_key;
    RETURN TRUE;
  END IF;

  -- 在窗口内，检查计数
  IF v_record.count >= p_limit THEN
    RETURN FALSE;
  END IF;

  -- 未超限，自增
  UPDATE public.rate_limits
  SET count = count + 1
  WHERE key = p_key;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
