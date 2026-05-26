-- ============================================================
-- 修复名额超卖问题
-- 1. 添加唯一约束防重复投稿（同一微信号+任务）
-- 2. 用行锁实现原子提交
-- ============================================================

-- 防重复投稿的唯一约束
ALTER TABLE public.task_completions
  ADD CONSTRAINT task_completions_unique_wechat
  UNIQUE (task_id, completer_wechat);

-- 原子提交 RPC
CREATE OR REPLACE FUNCTION public.submit_task_completion(
  p_share_code TEXT,
  p_wechat TEXT,
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

  -- 插入完成记录（唯一约束会兜底防重复）
  BEGIN
    INSERT INTO public.task_completions (
      task_id, completer_wechat, proof_screenshot_url, payment_status
    )
    VALUES (v_task_id, p_wechat, p_proof_url, 'pending')
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
