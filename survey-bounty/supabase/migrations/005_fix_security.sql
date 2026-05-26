-- ============================================================
-- 安全修复迁移
-- 1. 事务化信用分操作（状态更新 + 信用分加减原子性）
-- 2. 支持 dispute_pending 状态（举报不直接扣分）
-- 3. 修复 confirm 的 credit 事务
-- ============================================================

-- 确认收款的事务 RPC：状态更新 + 信用分 +5 原子性
CREATE OR REPLACE FUNCTION public.confirm_payment_transaction(
  p_completion_id UUID,
  p_creator_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT
) AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- 行锁防止并发确认
  SELECT payment_status INTO v_status
  FROM public.task_completions
  WHERE id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  IF v_status <> 'paid' THEN
    RETURN QUERY SELECT FALSE, 'STATUS_CONFLICT'::TEXT;
    RETURN;
  END IF;

  -- 更新状态
  UPDATE public.task_completions SET
    payment_status = 'confirmed',
    confirmed_at = now()
  WHERE id = p_completion_id;

  -- 加信用分（在同一事务内）
  UPDATE public.credit_scores SET
    completed_payments = completed_payments + 1,
    credit_score = LEAST(100, credit_score + 5),
    updated_at = now()
  WHERE user_id = p_creator_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 扣信用分函数保留（仲裁结果确认赖账时使用）
-- 旧函数已存在，这里确保它能被 dispute_pending → disputed 的仲裁流程调用
CREATE OR REPLACE FUNCTION public.decrement_credit_on_dispute(
  p_completion_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT
) AS $$
DECLARE
  v_status TEXT;
  v_creator_id UUID;
BEGIN
  SELECT tc.payment_status, t.creator_id
    INTO v_status, v_creator_id
  FROM public.task_completions tc
  JOIN public.tasks t ON t.id = tc.task_id
  WHERE tc.id = p_completion_id
  FOR UPDATE OF tc;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  IF v_status <> 'dispute_pending' THEN
    RETURN QUERY SELECT FALSE, 'STATUS_CONFLICT'::TEXT;
    RETURN;
  END IF;

  -- 标记为已仲裁（赖账确认）
  UPDATE public.task_completions SET
    payment_status = 'disputed'
  WHERE id = p_completion_id;

  -- 扣发布者信用分
  UPDATE public.credit_scores SET
    disputed_count = disputed_count + 1,
    credit_score = GREATEST(0, credit_score - 20),
    updated_at = now()
  WHERE user_id = v_creator_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
