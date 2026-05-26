-- ============================================================
-- AI 写问卷功能
-- 会话 + 消息 + 每日配额
-- ============================================================

-- 1. AI 问卷会话表
CREATE TABLE public.ai_survey_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新问卷',
  summary TEXT,                              -- AI 对需求的总结（镜像确认文本）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. AI 问卷消息表
CREATE TABLE public.ai_survey_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_survey_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  questions_snapshot JSONB,                  -- assistant 消息携带的题目快照（结构化 JSON）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 每日配额表（按 user_id + 自然日计数）
CREATE TABLE public.ai_survey_quota (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  used_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

-- 索引
CREATE INDEX idx_ai_survey_sessions_user ON public.ai_survey_sessions(user_id, updated_at DESC);
CREATE INDEX idx_ai_survey_messages_session ON public.ai_survey_messages(session_id, created_at);
CREATE INDEX idx_ai_survey_quota_user_date ON public.ai_survey_quota(user_id, usage_date);

-- RLS
ALTER TABLE public.ai_survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_survey_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_survey_quota ENABLE ROW LEVEL SECURITY;

-- sessions: 用户只能操作自己的会话
CREATE POLICY "Users can view own sessions"
  ON public.ai_survey_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.ai_survey_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.ai_survey_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.ai_survey_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- messages: 用户只能操作自己会话的消息
CREATE POLICY "Users can view own messages"
  ON public.ai_survey_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_survey_sessions
    WHERE id = session_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own messages"
  ON public.ai_survey_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_survey_sessions
    WHERE id = session_id AND user_id = auth.uid()
  ));

-- quota: 用户只能查看自己的配额
CREATE POLICY "Users can view own quota"
  ON public.ai_survey_quota FOR SELECT
  USING (auth.uid() = user_id);

-- 配额表由服务端操作，禁用客户端 INSERT/UPDATE/DELETE
-- （通过 RPC 或服务端 API route 写入）

-- 4. 配额检查 + 自增 RPC（原子操作）
-- @returns 剩余次数（>=0 表示允许，-1 表示超限）
CREATE OR REPLACE FUNCTION public.use_ai_survey_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 5
) RETURNS INTEGER AS $$
DECLARE
  v_used INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 尝试获取今天的配额记录
  SELECT used_count INTO v_used
  FROM public.ai_survey_quota
  WHERE user_id = p_user_id AND usage_date = v_today
  FOR UPDATE;

  IF NOT FOUND THEN
    -- 今天第一次使用，插入
    INSERT INTO public.ai_survey_quota (user_id, usage_date, used_count)
    VALUES (p_user_id, v_today, 1);
    RETURN p_daily_limit - 1;  -- 剩余次数
  END IF;

  -- 检查是否超限
  IF v_used >= p_daily_limit THEN
    RETURN -1;  -- 超限
  END IF;

  -- 未超限，自增
  UPDATE public.ai_survey_quota
  SET used_count = used_count + 1
  WHERE user_id = p_user_id AND usage_date = v_today;

  RETURN p_daily_limit - v_used - 1;  -- 剩余次数
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 查询剩余配额（不消耗）
CREATE OR REPLACE FUNCTION public.get_ai_survey_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 5
) RETURNS INTEGER AS $$
DECLARE
  v_used INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT COALESCE(used_count, 0) INTO v_used
  FROM public.ai_survey_quota
  WHERE user_id = p_user_id AND usage_date = v_today;

  RETURN p_daily_limit - v_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at 触发器
CREATE OR REPLACE FUNCTION public.update_ai_survey_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_survey_sessions_updated_at
  BEFORE UPDATE ON public.ai_survey_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_survey_session_timestamp();
