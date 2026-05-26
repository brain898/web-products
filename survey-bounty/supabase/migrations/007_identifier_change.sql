-- ============================================================
-- 标识符变更：微信号 → 姓名 + 手机号
-- 1. 新增 completer_name, completer_phone 字段
-- 2. 新增 verified_at 时间戳（用于计算平均回复时长）
-- 3. 更换唯一约束
-- 4. completer_wechat 改为 nullable（历史兼容）
-- 5. 更新 submit_task_completion RPC
-- ============================================================

-- 1. 新增字段
ALTER TABLE public.task_completions
  ADD COLUMN IF NOT EXISTS completer_name TEXT,
  ADD COLUMN IF NOT EXISTS completer_phone TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 2. 更换唯一约束
ALTER TABLE public.task_completions
  DROP CONSTRAINT IF EXISTS task_completions_unique_wechat;

ALTER TABLE public.task_completions
  ADD CONSTRAINT task_completions_unique_identity
  UNIQUE (task_id, completer_name, completer_phone);

-- 3. completer_wechat 改为 nullable
ALTER TABLE public.task_completions
  ALTER COLUMN completer_wechat DROP NOT NULL;

-- 4. 更新 RPC：新签名 (p_share_code, p_name, p_phone, p_proof_url)
CREATE OR REPLACE FUNCTION public.submit_task_completion(
  p_share_code TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_proof_url TEXT
) RETURNS TABLE (
  completion_id UUID,
  error_code TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_max_slots INTEGER;
  v_current INTEGER;
  v_status TEXT;
  v_new_id UUID;
BEGIN
  -- 行锁锁定任务，防止并发修改
  SELECT id, max_slots, current_completions, status
    INTO v_task_id, v_max_slots, v_current, v_status
  FROM public.tasks
  WHERE share_code = p_share_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 'NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  IF v_status <> 'active' THEN
    RETURN QUERY SELECT NULL::UUID, 'NOT_ACTIVE'::TEXT;
    RETURN;
  END IF;

  IF v_current >= v_max_slots THEN
    RETURN QUERY SELECT NULL::UUID, 'FULL'::TEXT;
    RETURN;
  END IF;

  -- 插入完成记录（唯一约束会兜底防重复：同一姓名+手机号+任务）
  BEGIN
    INSERT INTO public.task_completions (
      task_id, completer_name, completer_phone, proof_screenshot_url, payment_status
    )
    VALUES (v_task_id, p_name, p_phone, p_proof_url, 'pending')
    RETURNING id INTO v_new_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT NULL::UUID, 'DUPLICATE'::TEXT;
    RETURN;
  END;

  -- 更新任务计数；若达上限自动切换 full
  UPDATE public.tasks SET
    current_completions = v_current + 1,
    status = CASE WHEN v_current + 1 >= v_max_slots THEN 'full' ELSE status END
  WHERE id = v_task_id;

  RETURN QUERY SELECT v_new_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
