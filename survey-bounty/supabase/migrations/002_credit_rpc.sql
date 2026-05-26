-- 信用分 RPC 函数（在 Supabase SQL Editor 执行）

-- 完成付款 → 信用分 +5，completed_payments +1
CREATE OR REPLACE FUNCTION public.increment_credit(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.credit_scores
  SET
    completed_payments = completed_payments + 1,
    credit_score = LEAST(100, credit_score + 5),
    updated_at = now()
  WHERE credit_scores.user_id = increment_credit.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 争议 → 信用分 -20，disputed_count +1
CREATE OR REPLACE FUNCTION public.decrement_credit(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.credit_scores
  SET
    disputed_count = disputed_count + 1,
    credit_score = GREATEST(0, credit_score - 20),
    updated_at = now()
  WHERE credit_scores.user_id = decrement_credit.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
