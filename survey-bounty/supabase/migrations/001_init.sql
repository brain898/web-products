-- ============================================================
-- 问卷悬赏 - 数据库初始化迁移
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 1. profiles - 用户档案
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '匿名用户',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'filler'
    CHECK (role IN ('publisher', 'filler')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '用户档案，扩展 auth.users';
COMMENT ON COLUMN public.profiles.role IS 'publisher=发布者, filler=填写者（可兼任）';

-- 2. surveys - 问卷定义
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed', 'deleted')),
  share_code TEXT UNIQUE NOT NULL,
  total_budget INTEGER NOT NULL CHECK (total_budget > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  max_responses INTEGER NOT NULL CHECK (max_responses > 0),
  current_responses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.surveys IS '问卷定义';
COMMENT ON COLUMN public.surveys.total_budget IS '总预算（分）';
COMMENT ON COLUMN public.surveys.unit_price IS '单价（分）';
COMMENT ON COLUMN public.surveys.share_code IS '分享短码，用于 /s/{code} 路由';

-- 3. survey_questions - 问卷题目
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL
    CHECK (question_type IN ('single_choice', 'multiple_choice', 'text')),
  content TEXT NOT NULL,
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_options CHECK (
    question_type = 'text' OR jsonb_array_length(options) >= 2
  )
);

COMMENT ON TABLE public.survey_questions IS '问卷题目';
COMMENT ON COLUMN public.survey_questions.question_type IS 'single_choice=单选, multiple_choice=多选, text=简答';
COMMENT ON COLUMN public.survey_questions.options IS '选项数组，如 ["选项A", "选项B"]';

-- 4. survey_responses - 填写记录（核心状态机）
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_wechat TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'confirmed', 'disputed')),
  payment_screenshot_url TEXT,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.survey_responses IS '问卷填写记录，含付款状态机';
COMMENT ON COLUMN public.survey_responses.payment_status IS 'pending→paid→confirmed（正常）/ disputed（争议）';

-- 5. response_answers - 每题的回答
CREATE TABLE public.response_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(response_id, question_id)
);

COMMENT ON TABLE public.response_answers IS '每题的回答';
COMMENT ON COLUMN public.response_answers.answer_content IS '单选:{"value":"A"} 多选:{"values":["A","C"]} 简答:{"text":"..."}';

-- 6. credit_scores - 信用评分
CREATE TABLE public.credit_scores (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_surveys INTEGER NOT NULL DEFAULT 0,
  completed_payments INTEGER NOT NULL DEFAULT 0,
  disputed_count INTEGER NOT NULL DEFAULT 0,
  credit_score INTEGER NOT NULL DEFAULT 100
    CHECK (credit_score >= 0 AND credit_score <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.credit_scores IS '发布者信用评分';
COMMENT ON COLUMN public.credit_scores.credit_score IS '信用分，满分100，注册默认100';

-- ============================================================
-- RLS 策略
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles viewable"
  ON public.profiles FOR SELECT USING (true);

-- surveys
CREATE POLICY "Publishers manage own surveys"
  ON public.surveys FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Anyone can view active surveys"
  ON public.surveys FOR SELECT USING (status = 'active');

-- survey_questions
CREATE POLICY "Questions follow survey access"
  ON public.survey_questions FOR ALL
  USING (survey_id IN (SELECT id FROM public.surveys WHERE creator_id = auth.uid()));
CREATE POLICY "Anyone can view questions for active surveys"
  ON public.survey_questions FOR SELECT
  USING (survey_id IN (SELECT id FROM public.surveys WHERE status = 'active'));

-- survey_responses
CREATE POLICY "Publishers view own survey responses"
  ON public.survey_responses FOR SELECT
  USING (survey_id IN (SELECT id FROM public.surveys WHERE creator_id = auth.uid()));
CREATE POLICY "Publishers update own survey responses"
  ON public.survey_responses FOR UPDATE
  USING (survey_id IN (SELECT id FROM public.surveys WHERE creator_id = auth.uid()));
CREATE POLICY "Anyone can create responses"
  ON public.survey_responses FOR INSERT WITH CHECK (true);

-- response_answers
CREATE POLICY "Answers follow response access"
  ON public.response_answers FOR SELECT
  USING (response_id IN (
    SELECT id FROM public.survey_responses WHERE survey_id IN (
      SELECT id FROM public.surveys WHERE creator_id = auth.uid()
    )
  ));
CREATE POLICY "Anyone can create answers"
  ON public.response_answers FOR INSERT WITH CHECK (true);

-- credit_scores
CREATE POLICY "Credit scores publicly readable"
  ON public.credit_scores FOR SELECT USING (true);

-- ============================================================
-- 触发器
-- ============================================================

-- 新用户注册 → 自动创建 profile + credit_score
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', '匿名用户'));

  INSERT INTO public.credit_scores (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 自动更新
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
