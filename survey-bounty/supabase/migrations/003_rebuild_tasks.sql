-- ============================================================
-- 通用悬赏平台 - 重建数据库
-- 先在 Supabase SQL Editor 执行以下语句清理旧表，再执行建表
-- ============================================================

-- 清理旧表（按依赖顺序）
DROP TABLE IF EXISTS public.task_completions CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.response_answers CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP FUNCTION IF EXISTS public.increment_credit(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.decrement_credit(UUID) CASCADE;

-- ============================================================
-- 1. tasks - 悬赏任务
-- ============================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_image_url TEXT,                          -- 任务说明截图（问卷截图等）
  external_link TEXT,                           -- 外部链接（问卷星链接等）
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),  -- 赏金/人（分）
  max_slots INTEGER NOT NULL CHECK (max_slots > 0),          -- 名额上限
  current_completions INTEGER NOT NULL DEFAULT 0,             -- 已完成人数
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'full', 'closed', 'deleted')),
  share_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tasks IS '悬赏任务';
COMMENT ON COLUMN public.tasks.reward_amount IS '每人赏金（分），1元=100分';
COMMENT ON COLUMN public.tasks.task_image_url IS '任务说明截图 URL（Supabase Storage）';
COMMENT ON COLUMN public.tasks.external_link IS '外部链接（问卷星等）';
COMMENT ON COLUMN public.tasks.share_code IS '分享短码，用于 /t/{code} 路由';

-- ============================================================
-- 2. task_completions - 完成记录（核心状态机）
-- ============================================================
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completer_wechat TEXT NOT NULL,               -- 完成者微信号
  proof_screenshot_url TEXT,                    -- 完成截图（证明已完成任务）
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN (
      'pending',     -- 待审核（已提交截图，等发布者审核）
      'verified',    -- 已审核（发布者确认截图合格，等打款）
      'paid',        -- 已付款（发布者标记已打款）
      'confirmed',   -- 已确认（完成者确认收到）
      'disputed'     -- 争议中（完成者举报未收到）
    )),
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.task_completions IS '任务完成记录';
COMMENT ON COLUMN public.task_completions.payment_status IS
  'pending→verified→paid→confirmed（正常）/ disputed（争议）';

-- ============================================================
-- RLS 策略
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- tasks
CREATE POLICY "Publishers manage own tasks"
  ON public.tasks FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Anyone can view active tasks"
  ON public.tasks FOR SELECT USING (status IN ('active', 'full'));

-- task_completions
CREATE POLICY "Publishers view own task completions"
  ON public.task_completions FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE creator_id = auth.uid()));
CREATE POLICY "Publishers update own task completions"
  ON public.task_completions FOR UPDATE
  USING (task_id IN (SELECT id FROM public.tasks WHERE creator_id = auth.uid()));
CREATE POLICY "Anyone can create completions"
  ON public.task_completions FOR INSERT WITH CHECK (true);

-- ============================================================
-- 触发器
-- ============================================================
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_completions_updated_at
  BEFORE UPDATE ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 信用分 RPC（重新创建）
CREATE OR REPLACE FUNCTION public.increment_credit(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.credit_scores
  SET
    completed_payments = completed_payments + 1,
    credit_score = LEAST(100, credit_score + 5),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_credit(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.credit_scores
  SET
    disputed_count = disputed_count + 1,
    credit_score = GREATEST(0, credit_score - 20),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
